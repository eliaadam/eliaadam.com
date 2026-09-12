// components/sections/BuiltForEveryone.tsx
import {
  IconBusinesses,
  IconDevelopers,
  IconIndividuals,
  IconOrganizations,
} from "./icons";
import { SectionIntro } from "./SectionIntro";

export function BuiltForEveryone() {
  const personas = [
    {
      icon: <IconIndividuals />,
      title: "Individuals",
      body: "Discover products, services, and opportunities through simple digital experiences.",
    },
    {
      icon: <IconBusinesses />,
      title: "Businesses",
      body: "Reach customers, manage operations, transact, and fulfill demand through connected technology.",
    },
    {
      icon: <IconOrganizations />,
      title: "Organizations",
      body: "Collaborate, integrate, and build new solutions through our platform and technology capabilities.",
    },
    {
      icon: <IconDevelopers />,
      title: "Developers and partners",
      body: "Connect with an ecosystem designed to enable new products, services, and integrations.",
    },
  ];

  return (
    <section className="border-t border-[#D0D7DE] bg-[#F6F8FA] py-20 dark:border-[#30363D] dark:bg-[#161B22]">
      <div className="mx-auto max-w-6xl px-6">
        <SectionIntro title="Built for everyone in the ecosystem" />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p) => (
            <div
              key={p.title}
              className="rounded-lg border border-[#D0D7DE] bg-white p-6 transition-colors duration-300 hover:border-[#1F2328] dark:border-[#30363D] dark:bg-[#0D1117] dark:hover:border-[#E6EDF3]"
            >
              <span className="inline-flex text-[#1F2328] dark:text-[#E6EDF3]">
                {p.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-medium text-[#1F2328] dark:text-[#E6EDF3]">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#59636E] dark:text-[#8B949E]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
