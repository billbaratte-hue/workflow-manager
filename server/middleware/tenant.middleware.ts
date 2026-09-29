import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
    tenantId: string;
}

export const resolveTenant = (req: any, res: Response, next: NextFunction) => {
    // 1. Check custom tenant header
    const headerTenant = req.headers['x-tenant-id'];
    
    // 2. Check query param
    const queryTenant = req.query?.tenant_id;
    
    // 3. Check authenticated user token claim
    const userTenant = req.user?.tenant_id;
    
    // Default to 'default'
    const resolved = String(headerTenant || userTenant || queryTenant || 'default').toLowerCase().trim();
    
    req.tenantId = resolved || 'default';
    
    // Pass tenant ID in response headers for client verification
    res.setHeader('x-tenant-id', req.tenantId);
    
    next();
};
