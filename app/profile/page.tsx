import { redirect } from "next/navigation";
import { getMe, getProfile } from "@/lib/go-api";
import { headers } from "next/headers";
import { IdentityCore } from "@/app/components/profile/IdentityCore";
import { SkillMatrix } from "@/app/components/profile/SkillMatrix";
import { FeaturedProjects } from "@/app/components/profile/FeaturedProjects";
import { SystemLogs } from "@/app/components/profile/SystemLogs";
import { ProfileNav } from "@/app/components/profile/ProfileNav";
import { ScrollProgress } from "@/app/components/profile/ScrollProgress";
import { CursorGlow } from "@/app/components/profile/CursorGlow";
import { RevealOnScroll } from "@/app/components/profile/RevealOnScroll";
import { BackgroundLayer } from "@/app/components/profile/BackgroundLayer";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getMe(cookieHeader);
  if (!user) redirect("/auth?next=/profile");
  const data = await getProfile(cookieHeader);
  if (!data) redirect("/auth?next=/profile");

  const { profile } = data;

  return (
    <>
      <div className="grid-overlay" aria-hidden />
      <CursorGlow />
      <BackgroundLayer />
      <ProfileNav user={user} />
      <ScrollProgress />

      <main className="scroll-container" id="scrollContainer">
        <section className="snap-section px-4 md:px-10" id="section1">
          <div className="max-w-6xl w-full mx-auto">
            <IdentityCore profile={profile} />
          </div>
        </section>

        <section className="snap-section px-4 md:px-10" id="section2">
          <div className="max-w-6xl w-full mx-auto">
            <RevealOnScroll>
              <div className="mb-8 text-center">
                <h2 className="font-mono text-3xl md:text-4xl text-on-surface mb-2">
                  技能矩阵 <span className="text-primary opacity-50">{"//"}</span>{" "}
                  <span className="text-lg font-light text-on-surface-variant">TECHNOLOGY STACK</span>
                </h2>
              </div>
            </RevealOnScroll>
            <SkillMatrix categories={profile.skills} />
          </div>
        </section>

        <section className="snap-section px-4 md:px-10" id="section3">
          <div className="max-w-6xl w-full mx-auto">
            <RevealOnScroll>
              <div className="mb-10 text-center">
                <h2 className="font-mono text-3xl md:text-4xl text-on-surface mb-2">
                  精选项目 <span className="text-tertiary opacity-50">{"//"}</span>{" "}
                  <span className="text-lg font-light text-on-surface-variant">DEPLOYED SYSTEMS</span>
                </h2>
              </div>
            </RevealOnScroll>
            <FeaturedProjects projects={profile.projects} />
          </div>
        </section>

        <section className="snap-section px-4 md:px-10 pb-10" id="section4">
          <div className="max-w-4xl w-full mx-auto">
            <RevealOnScroll>
              <div className="mb-10 text-center">
                <h2 className="font-mono text-3xl md:text-4xl text-on-surface mb-2">
                  系统日志 <span className="text-primary opacity-50">{"//"}</span>{" "}
                  <span className="text-lg font-light text-on-surface-variant">EXECUTION TRACE</span>
                </h2>
              </div>
            </RevealOnScroll>
            <SystemLogs entries={profile.timeline} />
          </div>
        </section>
      </main>
    </>
  );
}
