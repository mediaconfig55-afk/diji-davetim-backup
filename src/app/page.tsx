import { getEventConfig } from "@/lib/event-config.server";
import Preloader from "@/components/Preloader";
import FloatingBackground from "@/components/FloatingBackground";
import Hero from "@/components/Hero";
import ParentsSection from "@/components/ParentsSection";
import ProgramSection from "@/components/ProgramSection";
import CountdownSection from "@/components/CountdownSection";
import RsvpSection from "@/components/RsvpSection";
import GuestbookSection from "@/components/GuestbookSection";
import IbanSection from "@/components/IbanSection";
import PhotoSection from "@/components/PhotoSection";
import SectionDivider from "@/components/SectionDivider";
import Footer from "@/components/Footer";

// Admin panelinden yapılan düzenlemeler anında yansısın diye her istekte
// yeniden çözümlenir; davetiye zaten hafif bir sayfa.
export const dynamic = "force-dynamic";

export default async function Home() {
  const config = await getEventConfig();

  return (
    <>
      <Preloader config={config} />
      <FloatingBackground />
      <main className="relative">
        <Hero config={config} />
        <ParentsSection config={config} />
        <SectionDivider />
        <ProgramSection config={config} />
        <SectionDivider />
        <CountdownSection config={config} />
        <SectionDivider />
        <RsvpSection />
        <SectionDivider />
        <GuestbookSection />
        <SectionDivider />
        <IbanSection config={config} />
        <SectionDivider />
        <PhotoSection config={config} />
        <Footer config={config} />
      </main>
    </>
  );
}
