import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UxTemplateProvider } from "./ux/UxTemplateProvider";
import { UUID_RE, fetchWorkspace, resolveSlug } from "./workspace/api";
import {
  WorkspaceStatusScreen,
  WorkspaceLoadingScreen,
} from "./workspace/WorkspaceStatusScreen";
import { WorkspaceBody } from "./workspace/shells/WorkspaceBody";

type SlugResolution = {
  slug: string;
  id: string | null;
  error: string | null;
};

export default function ContainerWorkspacePage() {
  const params = useParams<{
    containerId?: string;
    slug?: string;
    panel?: string;
  }>();
  const navigate = useNavigate();

  const rawId = params.containerId ?? params.slug ?? "";
  const isUuid = UUID_RE.test(rawId);

  const [slugResolution, setSlugResolution] = useState<SlugResolution>({
    slug: "",
    id: null,
    error: null,
  });

  useEffect(() => {
    if (isUuid) return;

    let cancelled = false;

    resolveSlug(rawId).then((r) => {
      if (cancelled) return;
      if (r === null) {
        setSlugResolution({ slug: rawId, id: null, error: "notfound" });
      } else if (r.type === "redirect") {
        const to = r.id.replace(/^redirect:/, "");
        const segments = window.location.pathname.split("/").filter(Boolean);
        const panelInUrl = segments[1];
        navigate(`/${to}${panelInUrl ? `/${panelInUrl}` : ""}`, {
          replace: true,
        });
      } else {
        setSlugResolution({ slug: rawId, id: r.id, error: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rawId, isUuid, navigate]);

  const matched = slugResolution.slug === rawId;
  const resolvedId = isUuid ? rawId : matched ? slugResolution.id : null;
  const resolveError = !isUuid && matched ? slugResolution.error : null;

  const workspaceQuery = useQuery({
    queryKey: ["workspace", resolvedId],
    queryFn: () => fetchWorkspace(resolvedId!),
    enabled: !!resolvedId,
    staleTime: 30_000,
  });

  if (resolveError === "notfound") {
    return (
      <WorkspaceStatusScreen
        title="Address not found"
        message={`No container is registered at /${rawId}.`}
      />
    );
  }

  if (!resolvedId || workspaceQuery.isLoading) {
    return <WorkspaceLoadingScreen />;
  }

  if (workspaceQuery.isError) {
    const status = (workspaceQuery.error as any)?.status;
    return (
      <WorkspaceStatusScreen
        title={status === 403 ? "No access" : "Container not found"}
        message={
          status === 403
            ? "You are not a member of this container."
            : (workspaceQuery.error as Error).message
        }
      />
    );
  }

  const workspace = workspaceQuery.data!;

  return (
    <UxTemplateProvider template={workspace.container.ux_template}>
      <WorkspaceBody
        workspace={workspace}
        containerId={resolvedId}
        addressBase={
          workspace.container.slug
            ? `/${workspace.container.slug}`
            : `/u/workspace/${resolvedId}`
        }
        panelSlugFromUrl={params.panel ?? null}
      />
    </UxTemplateProvider>
  );
}
