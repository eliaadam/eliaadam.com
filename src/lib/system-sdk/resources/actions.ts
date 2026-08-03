import type { HttpClient } from "../http-client.js";
import type {
  AuthorityAction,
  CreateActionRequest,
  UpdateActionRequest,
  UUID,
} from "../types.js";

/**
 * 9.1 Actions — /api/authority/actions
 * Actions represent verbs: create, read, update, delete, approve, publish, etc.
 */
export class ActionsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<AuthorityAction[]> {
    return this.http.get<AuthorityAction[]>("/api/authority/actions");
  }

  get(id: UUID): Promise<AuthorityAction> {
    return this.http.get<AuthorityAction>(`/api/authority/actions/${id}`);
  }

  create(payload: CreateActionRequest): Promise<AuthorityAction> {
    return this.http.post<AuthorityAction>("/api/authority/actions", payload);
  }

  /** Update requires all fields plus `status`. */
  update(id: UUID, payload: UpdateActionRequest): Promise<AuthorityAction> {
    return this.http.put<AuthorityAction>(`/api/authority/actions/${id}`, payload);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/authority/actions/${id}`);
  }
}
