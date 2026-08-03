import type { HttpClient } from "../http-client.js";
import type {
  Actor,
  CreateActorRequest,
  UpdateActorRequest,
  ActorType,
  CredentialType,
  CreateCredentialRequest,
  CredentialResource,
  RotateCredentialRequest,
  UUID,
} from "../types.js";

/**
 * 2. Actor Management — /api/identity/lumen/actors, /api/identity/ember/*
 * Admin-only (auth:sanctum + authority:system.admin) unless noted.
 */
export class ActorsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** GET /api/identity/lumen/actors */
  list(): Promise<Actor[]> {
    return this.http.getIdentity<Actor[]>("/api/identity/lumen/actors");
  }

  /** POST /api/identity/lumen/actors */
  create(payload: CreateActorRequest): Promise<Actor> {
    return this.http.postIdentity<Actor>("/api/identity/lumen/actors", payload);
  }

  /** PUT /api/identity/lumen/actors/{id} */
  update(id: UUID, payload: UpdateActorRequest): Promise<Actor> {
    return this.http.putIdentity<Actor>(
      `/api/identity/lumen/actors/${id}`,
      payload
    );
  }

  /** POST /api/identity/lumen/actors/{id}/activate */
  activate(id: UUID): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      `/api/identity/lumen/actors/${id}/activate`
    );
  }

  /** POST /api/identity/lumen/actors/{id}/suspend */
  suspend(id: UUID): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      `/api/identity/lumen/actors/${id}/suspend`
    );
  }

  /** POST /api/identity/lumen/actors/{id}/retire — permanent, actor can no longer authenticate. */
  retire(id: UUID): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      `/api/identity/lumen/actors/${id}/retire`
    );
  }

  /** GET /api/identity/lumen/actor-types */
  listActorTypes(): Promise<ActorType[]> {
    return this.http.getIdentity<ActorType[]>("/api/identity/lumen/actor-types");
  }

  /** GET /api/identity/ember/credential-types (auth:sanctum) */
  listCredentialTypes(): Promise<CredentialType[]> {
    return this.http.getIdentity<CredentialType[]>(
      "/api/identity/ember/credential-types"
    );
  }

  /** POST /api/identity/ember/actors/{actorId}/credentials (auth:sanctum) */
  createCredential(
    actorId: UUID,
    payload: CreateCredentialRequest
  ): Promise<CredentialResource> {
    return this.http.postIdentity<CredentialResource>(
      `/api/identity/ember/actors/${actorId}/credentials`,
      payload
    );
  }

  /** POST /api/identity/ember/actors/{actorId}/credentials/{id}/revoke (auth:sanctum) */
  revokeCredential(actorId: UUID, credentialId: UUID): Promise<unknown> {
    return this.http.postIdentity(
      `/api/identity/ember/actors/${actorId}/credentials/${credentialId}/revoke`
    );
  }

  /** POST /api/identity/ember/actors/{actorId}/credentials/{id}/rotate (auth:sanctum) */
  rotateCredential(
    actorId: UUID,
    credentialId: UUID,
    payload: RotateCredentialRequest
  ): Promise<CredentialResource> {
    return this.http.postIdentity<CredentialResource>(
      `/api/identity/ember/actors/${actorId}/credentials/${credentialId}/rotate`,
      payload
    );
  }
}
