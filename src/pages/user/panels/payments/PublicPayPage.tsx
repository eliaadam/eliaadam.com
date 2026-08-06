import { useParams } from "react-router-dom";
import PayLinkPage from "./PayLinkPage";

/**
 * Route wrapper for <Route path="/pay/:slug" element={<PublicPayPage />} />.
 * Reads the slug from the URL and hands it to the standalone pay page. This
 * route sits OUTSIDE the auth guards — anyone can open it.
 */
export default function PublicPayPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
        Invalid payment link.
      </div>
    );
  }

  return <PayLinkPage slug={slug} />;
}
