import CapabilityStub from "./CapabilityStub";
const step = "block mb-1";
export default function ProjectsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  void containerId;

  return (
    <CapabilityStub
      title="Projects"
      icon="📋"
      blurb="Create projects, assign members, and close them out."
      permissions={permissions}
      buildSteps={
        <>
          <span className={step}>
            Same eight steps as Invoicing. <code>projects</code> table,{" "}
            <code>ProjectService</code>, <code>OwnedResource</code>{" "}
            registration.
          </span>
          <span className={step}>
            The <code>project.assign</code> permission is the interesting one —
            assigning a member is where ownership and access meet, and it is
            exactly the case the orphan queue was built for.
          </span>
        </>
      }
    />
  );
}
