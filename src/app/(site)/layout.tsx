import ScrollProgress from "@/components/motion/ScrollProgress";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/** Public marketing pages share the floating navbar and footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
