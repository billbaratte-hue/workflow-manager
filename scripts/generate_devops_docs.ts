/**
 * @file scripts/generate_devops_docs.ts
 * Generates the complete DevOps documentation pack in Word (.docx) format
 * and bundles them into a ZIP archive for the DevOps team.
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    Header,
    Footer,
    PageNumber,
    ShadingType
} from 'docx';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

// Styling constants
const COLOR_PRIMARY = '002395'; // Corporate Blue
const COLOR_SECONDARY = '0088CE';
const COLOR_DARK = '1E293B';
const COLOR_MUTED = '64748B';
const COLOR_LIGHT_BG = 'F8FAFC';
const COLOR_BORDER = 'CBD5E1';
const COLOR_CODE_BG = 'F1F5F9';
const COLOR_WARNING_BG = 'FEF3C7';
const COLOR_SUCCESS_BG = 'DCFCE7';

// Helpers for Word Elements
function createHeader(): Header {
    return new Header({
        children: [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({
                        text: 'PORTAIL MÉCATRONIQUE — MECHATRONIC EXCHANGE PORTAL | DEVOPS RUNBOOK',
                        size: 16,
                        color: COLOR_MUTED,
                        font: 'Arial'
                    })
                ]
            })
        ]
    });
}

function createFooter(): Footer {
    return new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new TextRun({
                        text: 'CONFIDENTIAL — PORTAIL MÉCATRONIQUE | Page ',
                        size: 16,
                        color: COLOR_MUTED,
                        font: 'Arial'
                    }),
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 16,
                        color: COLOR_MUTED,
                        font: 'Arial'
                    }),
                    new TextRun({
                        text: ' of ',
                        size: 16,
                        color: COLOR_MUTED,
                        font: 'Arial'
                    }),
                    new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: 16,
                        color: COLOR_MUTED,
                        font: 'Arial'
                    })
                ]
            })
        ]
    });
}

function createTitleBanner(title: string, subtitle: string): Paragraph[] {
    return [
        new Paragraph({
            spacing: { before: 200, after: 100 },
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: 'PORTAIL MÉCATRONIQUE',
                    bold: true,
                    size: 24,
                    color: COLOR_SECONDARY,
                    font: 'Arial'
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 100, after: 200 },
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: title,
                    bold: true,
                    size: 40,
                    color: COLOR_PRIMARY,
                    font: 'Arial'
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 0, after: 400 },
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: subtitle,
                    italics: true,
                    size: 22,
                    color: COLOR_MUTED,
                    font: 'Arial'
                })
            ]
        })
    ];
}

function createMetaTable(docId: string, version: string, date: string, targetAudience: string): Table {
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER }
    };

    const makeRow = (label: string, value: string) => new TableRow({
        children: [
            new TableCell({
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: COLOR_LIGHT_BG, type: ShadingType.CLEAR },
                borders,
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: COLOR_DARK, font: 'Arial' })] })]
            }),
            new TableCell({
                width: { size: 6500, type: WidthType.DXA },
                borders,
                children: [new Paragraph({ children: [new TextRun({ text: value, size: 18, color: COLOR_DARK, font: 'Arial' })] })]
            })
        ]
    });

    return new Table({
        width: { size: 9500, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        rows: [
            makeRow('Document Reference', docId),
            makeRow('Project Contract', 'Contrat Cadre Mécatronique'),
            makeRow('Release Version', version),
            makeRow('Publication Date', date),
            makeRow('Target Audience', targetAudience),
            makeRow('Classification', 'Confidentiel Entreprise / ISEO DevOps')
        ]
    });
}

function createH1(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 150 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 28,
                color: COLOR_PRIMARY,
                font: 'Arial'
            })
        ]
    });
}

function createH2(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 250, after: 100 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 22,
                color: COLOR_SECONDARY,
                font: 'Arial'
            })
        ]
    });
}

function createH3(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 },
        children: [
            new TextRun({
                text,
                bold: true,
                size: 19,
                color: COLOR_DARK,
                font: 'Arial'
            })
        ]
    });
}

function createP(text: string): Paragraph {
    return new Paragraph({
        spacing: { before: 60, after: 100 },
        children: [
            new TextRun({
                text,
                size: 20,
                color: COLOR_DARK,
                font: 'Arial'
            })
        ]
    });
}

function createBullet(text: string, boldPrefix?: string): Paragraph {
    const children: TextRun[] = [];
    if (boldPrefix) {
        children.push(new TextRun({ text: boldPrefix + ' ', bold: true, size: 20, color: COLOR_DARK, font: 'Arial' }));
    }
    children.push(new TextRun({ text, size: 20, color: COLOR_DARK, font: 'Arial' }));

    return new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 60 },
        children
    });
}

function createCodeBlock(code: string): Table {
    const lines = code.trim().split('\n');
    return new Table({
        width: { size: 9500, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { fill: COLOR_CODE_BG, type: ShadingType.CLEAR },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
                            left: { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARY },
                            right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER }
                        },
                        children: lines.map(line => new Paragraph({
                            spacing: { before: 20, after: 20 },
                            children: [
                                new TextRun({
                                    text: line,
                                    font: 'Consolas',
                                    size: 17,
                                    color: '0F172A'
                                })
                            ]
                        }))
                    })
                ]
            })
        ]
    });
}

function createCallout(text: string, title = 'IMPORTANT NOTICE', type: 'info' | 'warning' = 'info'): Table {
    const bgColor = type === 'warning' ? COLOR_WARNING_BG : 'EFF6FF';
    const borderColor = type === 'warning' ? 'D97706' : COLOR_PRIMARY;

    return new Table({
        width: { size: 9500, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { fill: bgColor, type: ShadingType.CLEAR },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
                            left: { style: BorderStyle.SINGLE, size: 18, color: borderColor },
                            right: { style: BorderStyle.SINGLE, size: 1, color: borderColor }
                        },
                        children: [
                            new Paragraph({
                                spacing: { before: 40, after: 40 },
                                children: [
                                    new TextRun({ text: `[${title}] `, bold: true, size: 18, color: borderColor, font: 'Arial' }),
                                    new TextRun({ text, size: 18, color: COLOR_DARK, font: 'Arial' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function createTable(headers: string[], rows: string[][]): Table {
    const borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER }
    };

    const headerRow = new TableRow({
        children: headers.map(h => new TableCell({
            shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
            borders,
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: h, bold: true, size: 18, color: 'FFFFFF', font: 'Arial' })]
                })
            ]
        }))
    });

    const bodyRows = rows.map((r, i) => new TableRow({
        children: r.map(c => new TableCell({
            shading: { fill: i % 2 === 1 ? COLOR_LIGHT_BG : 'FFFFFF', type: ShadingType.CLEAR },
            borders,
            children: [
                new Paragraph({
                    children: [new TextRun({ text: c, size: 17, color: COLOR_DARK, font: 'Arial' })]
                })
            ]
        }))
    }));

    return new Table({
        width: { size: 9500, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        rows: [headerRow, ...bodyRows]
    });
}

// -----------------------------------------------------------------------------
// Document 1: Architecture & Infrastructure Guide
// -----------------------------------------------------------------------------
function buildDoc1(): Document {
    return new Document({
        sections: [{
            headers: { default: createHeader() },
            footers: { default: createFooter() },
            children: [
                ...createTitleBanner(
                    'Architecture & Infrastructure Guide',
                    'High Availability, Scalability for 20,000 Concurrent Requests, and MariaDB Galera Topology'
                ),
                createMetaTable('PORTAL-DOC-DEV-01', '1.0.0', 'September 2026', 'DevOps Engineers, Infrastructure Architects, SREs'),
                new Paragraph({ spacing: { after: 200 } }),

                createH1('1. Executive Overview & Mission Context'),
                createP('This document outlines the technical architecture, high-availability topology, and multi-tier scaling model for the Portail Mécatronique. The platform is engineered to support mission-critical mechatronic key and badge issuance, renewal, and restitution across the French national rail network, with strict performance guarantees (sub-second P95 latency under 20,000 concurrent requests).'),

                createH1('2. High-Level Architecture Topology'),
                createP('The platform adopts a cloud-native, strictly stateless 4-tier architecture designed for horizontal expansion:'),
                createBullet('Frontal Ingress & Edge Proxy: Terminating TLS 1.3, enforcing HTTP Strict Transport Security (HSTS), and distributing client requests with intelligent rate limiting.', 'Tier 1 - Reverse Proxy:'),
                createBullet('Stateless Container Cluster: N homogeneous Node.js/TypeScript application pods managed by Kubernetes with Horizontal Pod Autoscaling (4 to 20 instances based on CPU/RAM thresholds).', 'Tier 2 - Application Nodes:'),
                createBullet('Synchronous Distributed Cache: Redis 7 cluster for real-time reference caching, session revocation tracking, and distributed lock coordination.', 'Tier 3 - Distributed Cache:'),
                createBullet('Persistent Storage Tier: MariaDB 10.6+ Galera Cluster with utf8mb4_unicode_520_ci collation and S3-compatible object storage for encrypted mechatronic evidence.', 'Tier 4 - Database & Storage:'),

                createH2('2.1 Network & Component Topology Diagram'),
                createCodeBlock(`
+--------------------------------------------------------------------+
|                  INTERNET / INTRANET SECURE NETWORK                  |
+---------------------------------+----------------------------------+
                                  | HTTPS (Port 443) - TLS 1.3
                                  v
+--------------------------------------------------------------------+
|              FRONTAL LOAD BALANCER & NGINX REVERSE PROXY           |
|  - Rate Limiting: 50 req/s with dynamic Retry-After header         |
|  - Security Headers: CSP, HSTS Preload, X-Frame-Options: SAMEORIGIN|
|  - Static Asset Caching (JS, CSS, SVGs) with 30-day immutable cache|
+---------------------------------+----------------------------------+
                                  | Internal Private Mesh (VLAN/K8s)
                                  v
+--------------------------------------------------------------------+
|       STATELESS APPLICATION RUNTIME CLUSTER (Node.js 22 LTS)       |
|  +---------------------+  +---------------------+  +-------------+ |
|  | Pod 1 (UID 10001)   |  | Pod 2 (UID 10001)   |  | Pod N...    | |
|  | - X-Correlation-ID  |  | - X-Correlation-ID  |  | (HPA 4-20) | |
|  | - CPU Worker Pool   |  | - CPU Worker Pool   |  |             | |
|  +----------+----------+  +----------+----------+  +------+------+ |
+-------------|------------------------|--------------------|--------+
              |                        |                    |
       +------+------------------------+--------------------+------+
       | SQL Queries (Connection Pool)        | Shared Cache       |
       v                                      v                    v
+-----------------------------+ +--------------------+ +-------------------+
| MARIADB 10.6+ GALERA CLUSTER| | REDIS 7 CLUSTER    | | S3 OBJECT STORAGE |
| - utf8mb4_unicode_520_ci     | | - Reference Cache  | | - Attachments     |
| - Optimistic Version Locking| | - Token Deny-list  | | - Audit Archives  |
| - Slow Query Log (< 200 ms) | | - Degraded Fallback| | - SHA-256 Verified|
+-----------------------------+ +--------------------+ +-------------------+
                `),

                createH1('3. Database Sizing & MariaDB Galera Implementation (SCA-01, SCA-14, SCA-15)'),
                createP('The persistence layer is abstracted through the IDatabaseDriver interface, enabling seamless transition between SQLite (for ephemeral dev/demo) and MariaDB (for enterprise staging and production) via the DB_DRIVER environment variable.'),
                createTable(
                    ['Component / Parameter', 'Recommended Production Setting', 'Operational Justification'],
                    [
                        ['Collation & Encoding', 'utf8mb4 / utf8mb4_unicode_520_ci', 'Accent- and case-insensitive search (e.g. "elodie" matches "Élodie")'],
                        ['Max Connections', '300 per MariaDB Node', 'Absorbs peak connection spikes across multi-instance runtime'],
                        ['Connection Pool per Pod', 'Min 5, Max 25 (DB_POOL_MAX=25)', 'Prevents connection starvation while bounding database thread overhead'],
                        ['Slow Query Log Threshold', '200 ms (long_query_time=0.2)', 'Automated detection of non-indexed queries on 30,000 agents'],
                        ['Isolation Level', 'READ COMMITTED', 'Minimizes deadlocks during high-volume concurrent request transitions']
                    ]
                ),

                createH1('4. Scalability Target: 20,000 Concurrent Requests (SCA-12, SCA-13)'),
                createP('To guarantee that 20,000 simultaneous active users do not saturate the infrastructure, three architectural pillars are strictly enforced:'),
                createBullet('Asynchronous Micro-Batching: Agent auto-completion queries are throttled to 20 results with a 300 ms client debounce, bounded to index prefix scans.', '1. Read Optimization:'),
                createBullet('Thread Isolation (CPU Workers): Heavy CPU operations (PDF generation for GAP-08 transmission sheets, bcrypt hashing) run on separate worker_threads.', '2. CPU Offloading:'),
                createBullet('Streaming HTTP Responses: High-volume CSV exports are generated via Node.js TransformStream with O(1) memory footprint.', '3. Streaming Exports:')
            ]
        }]
    });
}

// -----------------------------------------------------------------------------
// Document 2: Deployment & Installation Runbook
// -----------------------------------------------------------------------------
function buildDoc2(): Document {
    return new Document({
        sections: [{
            headers: { default: createHeader() },
            footers: { default: createFooter() },
            children: [
                ...createTitleBanner(
                    'Deployment & Installation Runbook',
                    'Docker Compose Stacks, Kubernetes Helm Manifests, Database Migrations, and Zero-Downtime Rollbacks'
                ),
                createMetaTable('PORTAL-DOC-DEV-02', '1.0.0', 'September 2026', 'DevOps Engineers, Sysadmins, On-Call Operators'),
                new Paragraph({ spacing: { after: 200 } }),

                createH1('1. Quickstart: 1-Command Local Stack Deployment (DEP-03)'),
                createP('To spin up the complete mechatronic portal stack locally with demonstration data and MariaDB/Redis containers:'),
                createCodeBlock(`
# Step 1: Clone the repository
git clone https://gitlab.infra.fr/portal/portal-mecatronique.git
cd portal-mecatronique

# Step 2: Initialize environment variables from the verified template
cp .env.example .env

# Step 3: Start the containerized services in background mode
docker compose up -d --build

# Step 4: Execute database schema migrations
docker compose run --rm app node server/cli/admin-cli.js migrate

# Step 5: Provision the primary administrator account
docker compose run --rm app node server/cli/admin-cli.js create-admin --username=admin_iseo
                `),
                createCallout('The portal is now accessible at https://localhost (with TLS reverse proxy) or http://localhost:3000.', 'SUCCESS', 'info'),

                createH1('2. Comprehensive Environment Configuration Reference (DEP-04)'),
                createP('Every runtime parameter is injected via environment variables. Secret values must NEVER be committed to version control:'),
                createTable(
                    ['Variable Name', 'Default / Example Value', 'Confidentiality', 'Operational Description'],
                    [
                        ['NODE_ENV', 'production', 'Public', 'Sets runtime optimization flags and suppresses debug stacks.'],
                        ['PORT', '3000', 'Public', 'Internal TCP port on which the Express HTTP server listens.'],
                        ['DB_DRIVER', 'mariadb', 'Public', 'Database dialect: "sqlite" for demo/tests, "mariadb" for prod.'],
                        ['DB_HOST', 'mariadb.internal.infra', 'Internal', 'Hostname or cluster IP of the MariaDB Galera load balancer.'],
                        ['DB_PORT', '3306', 'Internal', 'TCP port of the relational database service.'],
                        ['DB_USER', 'portal_user', 'Restricted', 'Dedicated database user with minimal DML/DDL permissions.'],
                        ['DB_PASSWORD', 'vault:secret/db_pass', 'CRITICAL', 'Strong database authentication secret (managed via Vault).'],
                        ['DB_NAME', 'portal_demandes', 'Internal', 'Target relational database schema.'],
                        ['REDIS_URL', 'redis://redis:6379', 'Restricted', 'Connection URI for the distributed Redis 7 cache.'],
                        ['JWT_SECRET', 'vault:secret/jwt_key', 'CRITICAL', 'Cryptographic secret (min 32 chars) for HMAC-SHA256 tokens.'],
                        ['BACKUP_PASSPHRASE', 'vault:secret/backup_key', 'CRITICAL', 'Passphrase used for AES-256 database and document encryption.']
                    ]
                ),

                createH1('3. Versioned Database Migrations (DEP-05)'),
                createP('Database schema changes follow a versioned, idempotent forward-migration strategy tracked in the schema_migrations table:'),
                createCodeBlock(`
# Inspect migration status and apply pending versions
docker compose run --rm app node server/cli/admin-cli.js migrate

# Migration table schema (created automatically):
# CREATE TABLE schema_migrations (
#   id VARCHAR(128) PRIMARY KEY,
#   version INT NOT NULL UNIQUE,
#   description VARCHAR(255) NOT NULL,
#   checksum VARCHAR(64) NOT NULL,
#   applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
# );
                `),

                createH1('4. Zero-Downtime Rolling Upgrade & Rollback Procedures (DEP-11)'),
                createP('For minor and major maintenance releases, adhere strictly to the following sequence:'),
                createBullet('Trigger a manual encrypted database and document backup snapshot.', 'Phase 1 - Pre-flight Snapshot:'),
                createBullet('Pull the new signed Docker image tag (e.g., v1.2.1).', 'Phase 2 - Image Deployment:'),
                createBullet('Run schema migrations using an expand-and-contract model (old code remains functional).', 'Phase 3 - Schema Migration:'),
                createBullet('Kubernetes performs RollingUpdate (maxUnavailable=0, maxSurge=1).', 'Phase 4 - Rolling Upgrade:'),
                createBullet('Automated smoke test suite executes (/server/scripts/post-deploy-check.ts).', 'Phase 5 - Post-Deploy Verification:'),

                createH2('4.1 Emergency Rollback Protocol'),
                createCodeBlock(`
# If smoke tests fail, immediately revert the Kubernetes Deployment:
kubectl rollout undo deployment/portal-deployment -n portal-production

# If database rollback is necessary, restore the encrypted pre-flight snapshot:
docker compose run --rm app /app/server/scripts/restore.sh /var/backups/portal/portal_backup_YYYYMMDD_HHMMSS.tar.gz.enc
                `)
            ]
        }]
    });
}

// -----------------------------------------------------------------------------
// Document 3: Security Hardening & NIS 2 Compliance
// -----------------------------------------------------------------------------
function buildDoc3(): Document {
    return new Document({
        sections: [{
            headers: { default: createHeader() },
            footers: { default: createFooter() },
            children: [
                ...createTitleBanner(
                    'Security Hardening & NIS 2 Compliance',
                    'OWASP ASVS 5.0 Level 2 Controls, Non-Root Containers, Anti-IDOR Guards, and Audit Integrity'
                ),
                createMetaTable('PORTAL-DOC-DEV-03', '1.0.0', 'September 2026', 'Cybersecurity Officers (RSSI), DevOps Security, PASSI Auditors'),
                new Paragraph({ spacing: { after: 200 } }),

                createH1('1. Security Framework & Regulatory Foundations'),
                createP("In compliance with European Directive NIS 2 for Critical Infrastructure Operators (Opérateur d'Infrastructures) and OWASP ASVS 5.0 (Level 2), all access control, token verification, and data handling procedures are fortified against malicious intrusion."),

                createH1('2. Container & OS Hardening (SEC-03, DEP-01)'),
                createP('Application containers are stripped of non-essential binaries and execute under strict isolation:'),
                createBullet('The container executes under non-privileged UID 10001 (appuser) and GID 10001 (portalgroup). Root access is disabled.', 'Non-Root Execution:'),
                createBullet('Root filesystem is mounted read-only outside of explicitly declared scratch volumes (/app/uploads, /app/audit_archives).', 'Read-Only Filesystem:'),
                createBullet('All Linux kernel capabilities are explicitly dropped (cap_drop: ALL).', 'Capability Minimization:'),
                createBullet('Every build generates a CycloneDX Software Bill of Materials (bom.json) with automated vulnerability scanning.', 'SBOM & Supply Chain:'),

                createH1('3. Access Control & IDOR Prevention (SEC-04)'),
                createP('Every API endpoint resolving dossiers or attachments verifies both Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC):'),
                createTable(
                    ['Security Check', 'Mechanism', 'PASSI Test Scenario (SA-01 to SA-04)'],
                    [
                        ['Dossier Isolation', 'AuthorizationGuard.canAccessRequest()', 'User A cannot access User B dossiers even with valid numeric ID'],
                        ['Separation of Duties', 'enforceSeparationOfDuties()', 'Applicant cannot approve their own request (anti auto-approval)'],
                        ['Delegation Validation', 'Active temporal check in delegations table', 'Delegates can only approve within configured starts_at/ends_at'],
                        ['Geographic Perimeter', 'Regional / Site matching on user profile', 'Local key distributors can only inspect local site allocations']
                    ]
                ),

                createH1('4. Cryptographic Token Lifecycle (SEC-05)'),
                createP('User sessions rely on stateless JSON Web Tokens signed via HMAC-SHA256 with constant-time signature verification (crypto.timingSafeEqual):'),
                createBullet('Access tokens expire after 900 seconds (15 minutes).', 'Short Lifespan:'),
                createBullet('Each token embeds a unique cryptographic identifier (jti). Upon logout, the jti is blacklisted in Redis with TTL = remaining token lifespan.', 'Synchronous Deny-list:'),
                createBullet('Secret keys are derived from high-entropy Vault stores (minimum 256 bits).', 'Key Entropy:'),

                createH1('5. Input Sanitization & Anti-Injection Suite (SEC-06, SEC-08)'),
                createBullet('All database queries use parameterized placeholders (?). Dynamic string concatenation in SQL is strictly prohibited by CI linter.', 'SQL Injection:'),
                createBullet('Form comments and dynamic fields undergo HTML entity escaping (&, <, >, ", \').', 'Stored/Reflected XSS:'),
                createBullet('Exported CSV fields starting with =, +, -, @, \\t, or \\r are automatically prepended with a single quote (\').', 'Excel Formula Injection:'),
                createBullet('File attachments are verified against Magic Numbers (PDF %PDF, PNG, JPEG), disallowing disguised executables or double extensions.', 'File Upload Security:')
            ]
        }]
    });
}

// -----------------------------------------------------------------------------
// Document 4: Monitoring, Alerting & Performance Tuning
// -----------------------------------------------------------------------------
function buildDoc4(): Document {
    return new Document({
        sections: [{
            headers: { default: createHeader() },
            footers: { default: createFooter() },
            children: [
                ...createTitleBanner(
                    'Monitoring, Alerting & Performance Tuning',
                    'OpenMetrics/Prometheus Metrics, K6 Stress Testing, Event Loop Monitoring, and Chaos Engineering'
                ),
                createMetaTable('PORTAL-DOC-DEV-04', '1.0.0', 'September 2026', 'SREs, System Engineers, Production Support'),
                new Paragraph({ spacing: { after: 200 } }),

                createH1('1. Observability Architecture (SCA-22)'),
                createP('The platform exposes native Prometheus metrics at the /metrics endpoint, supporting standard OpenMetrics scraping:'),
                createTable(
                    ['Prometheus Metric Name', 'Type', 'Target SLO / Alert Threshold', 'Description'],
                    [
                        ['portal_http_requests_total', 'Counter', 'N/A', 'Cumulative count of HTTP requests partitioned by method, route, and status.'],
                        ['portal_http_duration_milliseconds{quantile="0.95"}', 'Gauge', '< 1000 ms (SLO P95)', '95th percentile response latency for end-user transactions.'],
                        ['portal_http_duration_milliseconds{quantile="0.99"}', 'Gauge', '< 2500 ms (SLO P99)', '99th percentile response latency under extreme traffic peaks.'],
                        ['portal_cache_hit_ratio', 'Gauge', '> 0.85 (85%)', 'Ratio of requests fulfilled by Redis cache vs fallback to MariaDB.'],
                        ['portal_error_rate', 'Gauge', '< 0.001 (< 0.1%)', 'Fraction of requests resulting in HTTP 5xx responses.']
                    ]
                ),

                createH1('2. Prometheus Alerting Rules Configuration'),
                createP('Deploy the following alert definitions to your Prometheus Alertmanager instance:'),
                createCodeBlock(`
groups:
  - name: mechatronic_portal_alerts
    rules:
      - alert: HighLatencyP95
        expr: portal_http_duration_milliseconds{quantile="0.95"} > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency exceeded 1 second threshold (SCA-12 violation)"

      - alert: MariaDbConnectionPoolSaturation
        expr: portal_db_pool_active_connections / portal_db_pool_max_connections > 0.85
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MariaDB connection pool utilization exceeds 85%"

      - alert: HighHttpErrorRate
        expr: rate(portal_http_requests_total{status=~"5.."}[5m]) / rate(portal_http_requests_total[5m]) > 0.01
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "5xx HTTP error rate exceeds 1% of total portal traffic"
                `),

                createH1('3. Automated Load Testing with K6 (SCA-12)'),
                createP('The platform includes an automated K6 test harness simulating 20,000 concurrent Virtual Users (VUs) and 30,000 agents:'),
                createCodeBlock(`
# Run the K6 test scenario against the target environment
k6 run --vus 20000 --duration 10m tests/load/k6-simulation.js

# Target Criteria:
# - http_req_duration: p(95) < 1000 ms
# - http_req_failed: rate < 0.01
# - portal_agent_search_duration: p(95) < 500 ms
                `),

                createH1('4. Chaos Engineering & Resilience Testing (SCA-23)'),
                createP('Resilience is verified automatically in the CI/CD pipeline and staging environments:'),
                createBullet('Simulated Redis outage triggers automatic in-memory fallback. Zero requests fail; latency increases gracefully.', 'Test 1 - Cache Outage:'),
                createBullet('Worker pod killed during active workflow transition. Optimistic locking prevents partial or duplicate state.', 'Test 2 - Pod Crash during Decision:'),
                createBullet('Secondary MariaDB replica severed. Reads failover immediately to primary master without data loss.', 'Test 3 - DB Replica Failover:')
            ]
        }]
    });
}

// -----------------------------------------------------------------------------
// Document 5: CLI Operations & Troubleshooting Handbook
// -----------------------------------------------------------------------------
function buildDoc5(): Document {
    return new Document({
        sections: [{
            headers: { default: createHeader() },
            footers: { default: createFooter() },
            children: [
                ...createTitleBanner(
                    'CLI Operations & Troubleshooting Handbook',
                    'Ephemeral Container Commands, Incident Diagnostic Trees, and Operational Playbooks'
                ),
                createMetaTable('PORTAL-DOC-DEV-05', '1.0.0', 'September 2026', 'On-Call Engineers, Level 2/3 Support, Production Operators'),
                new Paragraph({ spacing: { after: 200 } }),

                createH1('1. Ephemeral Admin CLI Reference (DEP-18)'),
                createP('Production maintenance operations are executed inside ephemeral containers to avoid leaving credentials or history on host machines:'),
                createTable(
                    ['CLI Command', 'Syntax Example', 'Description & Safeguards'],
                    [
                        ['create-admin', 'node server/cli/admin-cli.js create-admin --username=admin.iseo', 'Generates a new administrator account with a high-entropy temporary password.'],
                        ['reset-password', 'node server/cli/admin-cli.js reset-password --username=dupont_m', 'Safely resets a locked account with a new cryptographic hash.'],
                        ['migrate', 'node server/cli/admin-cli.js migrate', 'Applies pending schema migrations under distributed table lock.'],
                        ['check-delays', 'node server/cli/admin-cli.js check-delays', 'Manually runs S14 foreclosure and reminder escalations (Standard Opérationnel).'],
                        ['purge-rgpd', 'node server/cli/admin-cli.js purge-rgpd --days=1095', 'Purges inactive user accounts and archives personal data past retention period.'],
                        ['db-health', 'node server/cli/admin-cli.js db-health', 'Audits database ping, character collation, and pool latency.']
                    ]
                ),

                createH1('2. Incident Resolution Playbook & Diagnostic Tree'),
                createH2('Incident 1: HTTP 503 Service Unavailable on /healthz/readiness'),
                createBullet('Inspect pod status: kubectl get pods -n portal-production', 'Step 1:'),
                createBullet('Inspect detailed readiness response: curl -s http://localhost:3000/healthz/readiness | jq', 'Step 2:'),
                createBullet('If "database": "DOWN" -> Check MariaDB connectivity, max_connections pool, and disk space.', 'Step 3:'),
                createBullet('If MariaDB was restarted, pods reconnect automatically via built-in retry backoff.', 'Step 4:'),

                createH2('Incident 2: HTTP 429 Too Many Requests (Rate Limiting Triggered)'),
                createP('Occurs when an IP or user exceeds the 50 req/s threshold (SCA-17). Verify if traffic originates from a legitimate batch client or automated script:'),
                createCodeBlock(`
# Inspect NGINX rate limiting logs:
tail -n 100 /var/log/nginx/access.log | grep " 429 "

# If traffic is legitimate (e.g., annual HR synchronization), adjust RATE_LIMIT_MAX in ConfigMap:
# RATE_LIMIT_MAX=200
kubectl rollout restart deployment/portal-deployment -n portal-production
                `),

                createH2('Incident 3: HTTP 409 Concurrency Conflict (SCA-18)'),
                createP('Occurs when two validators (or a validator and their delegate) attempt to act on the same dossier simultaneously. The optimistic version lock protects data integrity.'),
                createCallout('Instruct the user to refresh their browser tab. The latest validated version of the dossier will load cleanly.', 'RESOLUTION', 'info'),

                createH1('3. Routine Daily & Weekly Operations Checklist'),
                createBullet('Review Prometheus Grafana dashboard for P95 latency anomalies.', 'Daily 08:00:'),
                createBullet('Verify that automated nightly backup succeeded and .sha256 signature is valid.', 'Daily 09:00:'),
                createBullet('Inspect MariaDB slow query log for queries exceeding 200 ms.', 'Weekly Monday:'),
                createBullet('Perform routine test restoration of backup archive in isolated staging namespace.', 'Monthly 1st:'),
                createBullet('Execute npm audit and generate updated CycloneDX SBOM.', 'Monthly 15th:')
            ]
        }]
    });
}

// -----------------------------------------------------------------------------
// Orchestration & ZIP Generation
// -----------------------------------------------------------------------------
async function main() {
    console.log('[DOCS_GEN] Generating professional Word (.docx) documents for DevOps team...');

    const doc1 = buildDoc1();
    const doc2 = buildDoc2();
    const doc3 = buildDoc3();
    const doc4 = buildDoc4();
    const doc5 = buildDoc5();

    console.log('[DOCS_GEN] Packing documents into binary buffers...');
    const [buf1, buf2, buf3, buf4, buf5] = await Promise.all([
        Packer.toBuffer(doc1),
        Packer.toBuffer(doc2),
        Packer.toBuffer(doc3),
        Packer.toBuffer(doc4),
        Packer.toBuffer(doc5)
    ]);

    const zip = new JSZip();

    zip.file('01_DevOps_Architecture_and_Infrastructure_Guide.docx', buf1);
    zip.file('02_DevOps_Deployment_and_Installation_Runbook.docx', buf2);
    zip.file('03_DevOps_Security_Hardening_and_NIS2_Compliance.docx', buf3);
    zip.file('04_DevOps_Monitoring_Alerting_and_Performance_Tuning.docx', buf4);
    zip.file('05_DevOps_CLI_Operations_and_Troubleshooting_Handbook.docx', buf5);

    // Also include a master README in Markdown for immediate CLI terminal viewing
    zip.file('README_DEVOPS.md', `# Portail Mécatronique — DevOps Documentation Suite
Contract N° 2026RFI026084 (Standard Opérationnel)

This documentation package contains the complete technical specifications, architecture diagrams, runbooks, and troubleshooting guides in Microsoft Word (.docx) format:

1. 01_DevOps_Architecture_and_Infrastructure_Guide.docx
   - Multi-tier stateless topology, MariaDB Galera cluster, Redis distributed cache, and 20,000 concurrent VU sizing.

2. 02_DevOps_Deployment_and_Installation_Runbook.docx
   - Step-by-step installation, Docker Compose stacks, Kubernetes HPA manifests, database migrations, and zero-downtime rollback protocols.

3. 03_DevOps_Security_Hardening_and_NIS2_Compliance.docx
   - OWASP ASVS 5.0 Level 2 compliance, non-root containers (UID 10001), RBAC/ABAC anti-IDOR guards, JWT lifecycle, and CSV formula de-fanging.

4. 04_DevOps_Monitoring_Alerting_and_Performance_Tuning.docx
   - Prometheus metrics (/metrics), Alertmanager rules, Grafana dashboards, K6 load testing suite, and Chaos Engineering scenarios.

5. 05_DevOps_CLI_Operations_and_Troubleshooting_Handbook.docx
   - Ephemeral admin CLI commands, diagnostic trees for HTTP 503/429/409 errors, and routine operational checklists.

Target SLA: 99.95% Availability | P95 Latency < 1.0s under 20,000 concurrent requests.
`);

    console.log('[DOCS_GEN] Compressing ZIP archive...');
    const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
    });

    const outputZipPath = path.resolve(process.cwd(), 'public', 'DevOps_Documentation_Pack.zip');
    fs.writeFileSync(outputZipPath, zipBuffer);

    console.log(`[DOCS_GEN] ✅ SUCCESS: Archive generated at ${outputZipPath} (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(err => {
    console.error('[DOCS_GEN] ❌ Error generating documentation:', err);
    process.exit(1);
});
