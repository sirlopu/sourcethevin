import { Types } from 'mongoose';

/**
 * Single-tenant V1: every user (seller, trade_desk, admin) shares this one platform
 * tenant, regardless of which dealership a seller belongs to. Sellers only ever see
 * their own submissions (enforced by sellerId, not tenantId); trade_desk/admin see the
 * full queue across all sellers because they share this tenant. The data model supports
 * multiple tenants later — none is provisioned yet.
 */
export const DEFAULT_TENANT_ID = new Types.ObjectId('000000000000000000000001');
