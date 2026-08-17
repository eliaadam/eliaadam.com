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
 * 2. Actor Management — /api/v1/identity/lumen/actors, /api/v1/identity/ember/*
 * Admin-only (auth:sanctum + authority:system.admin) unless noted.
 */
export class ActorsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** GET /api/v1/identity/lumen/actors */
  list(): Promise<Actor[]> {
    return this.http.getIdentity<Actor[]>("/api/v1/identity/lumen/actors");
  }

  /** POST /api/v1/identity/lumen/actors */
  create(payload: CreateActorRequest): Promise<Actor> {
    return this.http.postIdentity<Actor>("/api/v1/identity/lumen/actors", payload);
  }

  /** PUT /api/v1/identity/lumen/actors/{id} */
  update(id: UUID, payload: UpdateActorRequest): Promise<Actor> {
    return this.http.putIdentity<Actor>(
      `/api/v1/identity/lumen/actors/${id}`,
      payload
    );
  }

  /** POST /api/v1/identity/lumen/actors/{id}/activate */
  activate(id: UUID): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      `/api/v1/identity/lumen/actors/${id}/activate`
    );
  }

  /** POST /api/v1/identity/lumen/actors/{id}/suspend */
  suspend(id: UUID): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      `/api/v1/identity/lumen/actors/${id}/suspend`
    );
  }

  /** POST /api/v1/identity/lumen/actors/{id}/retire — permanent, actor can no longer authenticate. */
  retire(id: UUID): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      `/api/v1/identity/lumen/actors/${id}/retire`
    );
  }

  /** GET /api/v1/identity/lumen/actor-types */
  listActorTypes(): Promise<ActorType[]> {
    return this.http.getIdentity<ActorType[]>("/api/v1/identity/lumen/actor-types");
  }

  /** GET /api/v1/identity/ember/credential-types (auth:sanctum) */
  listCredentialTypes(): Promise<CredentialType[]> {
    return this.http.getIdentity<CredentialType[]>(
      "/api/v1/identity/ember/credential-types"
    );
  }

  /** POST /api/v1/identity/ember/actors/{actorId}/credentials (auth:sanctum) */
  createCredential(
    actorId: UUID,
    payload: CreateCredentialRequest
  ): Promise<CredentialResource> {
    return this.http.postIdentity<CredentialResource>(
      `/api/v1/identity/ember/actors/${actorId}/credentials`,
      payload
    );
  }

  /** POST /api/v1/identity/ember/actors/{actorId}/credentials/{id}/revoke (auth:sanctum) */
  revokeCredential(actorId: UUID, credentialId: UUID): Promise<unknown> {
    return this.http.postIdentity(
      `/api/v1/identity/ember/actors/${actorId}/credentials/${credentialId}/revoke`
    );
  }

  /** POST /api/v1/identity/ember/actors/{actorId}/credentials/{id}/rotate (auth:sanctum) */
  rotateCredential(
    actorId: UUID,
    credentialId: UUID,
    payload: RotateCredentialRequest
  ): Promise<CredentialResource> {
    return this.http.postIdentity<CredentialResource>(
      `/api/v1/identity/ember/actors/${actorId}/credentials/${credentialId}/rotate`,
      payload
    );
  }
}
