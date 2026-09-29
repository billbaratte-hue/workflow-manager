import { describe, it, expect } from 'vitest';
import { ChampsConditionnelsService, DEFAULT_CONDITIONAL_RULES } from '../../server/services/champsConditionnels.service';

describe('User Story 5.1: Form Validation & Conditional Rules Evaluation', () => {
    it('validates mandatory fields for mechatronic cylinder forms', () => {
        const payloadWithoutGPS = {
            equipment_type: 'Cylindre Mécatronique',
            site_id: 1
        };

        const result = ChampsConditionnelsService.evaluate(payloadWithoutGPS, DEFAULT_CONDITIONAL_RULES);
        expect(result.isValid).toBe(false);
        expect(result.errors['gps_latitude']).toBeTruthy();
        expect(result.errors['gps_longitude']).toBeTruthy();
    });

    it('validates complete payload with conditional GPS coordinates', () => {
        const validPayload = {
            equipment_type: 'Cylindre Mécatronique',
            gps_latitude: '48.8566',
            gps_longitude: '2.3522',
            site_id: 1
        };

        const result = ChampsConditionnelsService.evaluate(validPayload, DEFAULT_CONDITIONAL_RULES);
        expect(result.isValid).toBe(true);
        expect(Object.keys(result.errors).length).toBe(0);
    });

    it('requires team members if is_team_request is set to true', () => {
        const teamPayload = {
            is_team_request: true,
            equipment_type: 'Clé Mécatronique EN 15864'
        };

        const evalResult = ChampsConditionnelsService.evaluate(teamPayload, DEFAULT_CONDITIONAL_RULES);
        expect(evalResult.isValid).toBe(false);
        expect(evalResult.errors['team_name']).toBeTruthy();
        expect(evalResult.errors['team_members']).toBeTruthy();
    });
});
