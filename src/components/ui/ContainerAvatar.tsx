import { useQuery } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { Avatar } from "./Avatar";

interface ContainerAvatarProps {
  containerId: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * Fetches + displays one container's avatar, lazily — only called for
 * containers actually being rendered (the switcher's own tiles), not
 * eagerly for every container a user belongs to. Backend resolves the
 * container's representing actor and its avatar URL in one call (see
 * `container_avatar_url` view) — this component doesn't need to know
 * container-as-actor exists at all, it just asks "what's this
 * container's avatar" and gets an answer.
 *
 * `staleTime` is deliberately long — avatars don't change often, and
 * this avoids re-fetching the same URL every time a component using
 * this remounts (e.g. every time the switcher popover opens/closes).
 */
export function ContainerAvatar({
  containerId,
  name,
  size,
  className,
}: ContainerAvatarProps) {
  const { data } = useQuery({
    queryKey: ["container", "avatar-url", containerId],
    queryFn: () => sdk.container.getContainerAvatarUrl(containerId),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Avatar
      src={data?.avatar_url}
      name={name}
      size={size}
      className={className}
    />
  );
}
