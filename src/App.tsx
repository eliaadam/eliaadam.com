import { useMemo } from "react";

import { resolveApplication } from "./platform/application";

import MainApp from "./applications/main/MainApp";
import BusinessApp from "./applications/business/BusinessApp";
import DocsApp from "./applications/docs/DocsApp";

export default function App() {
  const application = useMemo(() => resolveApplication(), []);

  switch (application.definition.code) {
    case "main":
      return <MainApp />;

    case "docs":
      return <DocsApp />;

    case "business":
      return <BusinessApp />;

    default:
      return (
        <div>
          <h1>Application unavailable</h1>
          <p>The requested application is not configured.</p>
        </div>
      );
  }
}
