import type { HttpClient } from "../http-client.js";
import type {
  Invitation,
  CreateInvitationRequest,
  RedeemInvitationRequest,
  Membership,
  UUID,
} from "../types.js";

/**
 * 7. Invitation Management — /api/hierarchy/invitations, /api/hierarchy/containers/{id}/invitations
 *
 * Note: the invitation `token` field is never exposed in API responses.
 */
export class InvitationsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** GET /api/hierarchy/containers/{containerId}/invitations */
  listForContainer(containerId: UUID): Promise<Invitation[]> {
    return this.http.get<Invitation[]>(
      `/api/hierarchy/containers/${containerId}/invitations`
    );
  }

  /** GET /api/hierarchy/invitations/{id} */
  get(id: UUID): Promise<Invitation> {
    return this.http.get<Invitation>(`/api/hierarchy/invitations/${id}`);
  }

  /**
   * POST /api/hierarchy/invitations
   * Errors:
   *  - HierarchyPolicyViolationException if the container disallows invitations
   *  - MembershipAlreadyExistsException if the invitee already has active membership
   */
  create(payload: CreateInvitationRequest): Promise<Invitation> {
    return this.http.post<Invitation>("/api/hierarchy/invitations", payload);
  }

  /**
   * POST /api/hierarchy/invitations/redeem
   * Returns the newly-active Membership.
   * Errors: InvitationRevokedException, InvitationExpiredException
   */
  redeem(payload: RedeemInvitationRequest): Promise<Membership> {
    return this.http.post<Membership>("/api/hierarchy/invitations/redeem", payload);
  }

  /** POST /api/hierarchy/invitations/{id}/revoke -> status "cancelled" */
  revoke(id: UUID): Promise<Invitation> {
    return this.http.post<Invitation>(`/api/hierarchy/invitations/${id}/revoke`);
  }

  /** POST /api/hierarchy/invitations/{id}/expire -> status "expired" */
  expire(id: UUID): Promise<Invitation> {
    return this.http.post<Invitation>(`/api/hierarchy/invitations/${id}/expire`);
  }
}
