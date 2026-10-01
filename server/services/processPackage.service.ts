/**
 * @file server/services/processPackage.service.ts
 * Process Package Bundler (Export & Import Portable Workflow Packages).
 * Packages complete processes including lifecycle state machine, dynamic forms, and business rules.
 */

import crypto from 'crypto';
import {
    processTemplates,
    formTemplatesDatabase,
    businessRulesStore,
    logAction,
    ProcessTemplate,
    FormTemplate,
    BusinessRule
} from '../db/store.js';
import { configRepository } from '../repositories/config.repository.js';

export interface ProcessPackage {
    manifest: {
        version: string;
        packageId: string;
        exportedAt: string;
        exportedBy: string;
        checksum: string;
    };
    process: ProcessTemplate;
    formTemplate?: FormTemplate | null;
    businessRules?: BusinessRule[];
}

export class ProcessPackageService {
    /**
     * Exports a complete self-contained package for a given process template
     */
    static async exportPackage(processId: number, exportedBy: string = 'Admin'): Promise<ProcessPackage> {
        const process = processTemplates.find(p => p.id === processId);
        if (!process) {
            throw new Error(`Processus avec l'ID ${processId} introuvable.`);
        }

        // 1. Locate linked dynamic form template
        const formTemplate = formTemplatesDatabase.find(
            f => f.linked_process_id === processId || (f.code && process.code && f.code === process.code)
        ) || null;

        // 2. Locate linked business rules
        const processCode = process.code || `PROC_${process.id}`;
        const linkedRules = businessRulesStore.filter(
            r => r.associated_processes && (r.associated_processes.includes(processCode) || r.associated_processes.includes(String(process.id)))
        );

        const exportedAt = new Date().toISOString();
        const payloadToHash = JSON.stringify({ process, formTemplate, linkedRules });
        const checksum = crypto.createHash('sha256').update(payloadToHash).digest('hex');

        return {
            manifest: {
                version: '1.0.0',
                packageId: `PKG_${process.id}_${Date.now()}`,
                exportedAt,
                exportedBy,
                checksum
            },
            process: JSON.parse(JSON.stringify(process)),
            formTemplate: formTemplate ? JSON.parse(JSON.stringify(formTemplate)) : null,
            businessRules: JSON.parse(JSON.stringify(linkedRules))
        };
    }

    /**
     * Imports and instantiates a complete process package into the platform
     */
    static async importPackage(pkg: ProcessPackage, importedBy: string = 'Admin'): Promise<{
        success: boolean;
        processId: number;
        processName: string;
        stagesCount: number;
        fieldsCount: number;
        rulesCount: number;
    }> {
        if (!pkg || !pkg.manifest || !pkg.process) {
            throw new Error("Structure de package invalide : manifest ou définition de processus manquant.");
        }

        const sourceProcess = pkg.process;
        // Compute new unique ID
        const nextProcessId = processTemplates.length ? Math.max(...processTemplates.map(p => p.id || 0)) + 1 : 1;
        const newProcessName = processTemplates.some(p => p.name === sourceProcess.name)
            ? `${sourceProcess.name} (Import ${new Date().toLocaleDateString('fr-FR')})`
            : sourceProcess.name;

        // 1. Import dynamic form template if present
        let newFormId: string | undefined = undefined;
        let importedFieldsCount = 0;

        if (pkg.formTemplate) {
            newFormId = `form_pkg_${nextProcessId}_${Date.now()}`;
            const newForm: FormTemplate = {
                ...pkg.formTemplate,
                id: newFormId,
                name: `${pkg.formTemplate.name || sourceProcess.name} (Import)`,
                code: `${pkg.formTemplate.code || 'FORM'}_${nextProcessId}`,
                linked_process_id: nextProcessId,
                fields: pkg.formTemplate.fields || []
            };
            formTemplatesDatabase.push(newForm);
            importedFieldsCount = newForm.fields?.length || 0;
            try {
                await configRepository.saveForm(newForm);
            } catch (err) {
                console.warn("Could not persist imported form in DB:", err);
            }
        }

        // 2. Import business rules if present
        let importedRulesCount = 0;
        if (Array.isArray(pkg.businessRules)) {
            for (const rule of pkg.businessRules) {
                const newRuleId = `rule_pkg_${nextProcessId}_${Math.random().toString(36).substring(2, 7)}`;
                const newRule: BusinessRule = {
                    ...rule,
                    id: newRuleId,
                    title: `${rule.title || rule.code} (Import)`,
                    code: `RULE_${nextProcessId}_${rule.code || Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    associated_processes: [sourceProcess.code || `PROC_${nextProcessId}`, String(nextProcessId)]
                };
                businessRulesStore.push(newRule);
                importedRulesCount++;
            }
        }

        // 3. Import process template
        const importedProcess: ProcessTemplate = {
            ...sourceProcess,
            id: nextProcessId,
            name: newProcessName,
            code: `${sourceProcess.code || 'WF'}_IMP_${nextProcessId}`,
            stages: (sourceProcess.stages || []).map((stg, idx) => ({
                ...stg,
                id: `stg_imp_${nextProcessId}_${idx + 1}`
            }))
        };

        processTemplates.push(importedProcess);
        try {
            await configRepository.saveProcess(importedProcess);
        } catch (err) {
            console.warn("Could not persist imported process in DB:", err);
        }

        // 4. Log audit trail
        logAction(
            importedBy,
            "Administrateur",
            "IMPORT_PROCESS_PACKAGE",
            importedProcess.name,
            `Importation réussie du package ${pkg.manifest.packageId} (ID Processus: ${nextProcessId})`
        );

        return {
            success: true,
            processId: nextProcessId,
            processName: importedProcess.name,
            stagesCount: importedProcess.stages?.length || 0,
            fieldsCount: importedFieldsCount,
            rulesCount: importedRulesCount
        };
    }
}
