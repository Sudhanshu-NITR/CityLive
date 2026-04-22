import CityMap from "@/components/CityMap";
import PulseFeed from "@/components/PulseFeed";
import SubmitReportButton from "@/components/SubmitReportButton";
import { Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden p-4 relative">
      {/* Left Sidebar Layout */}
      <aside className="w-1/3 max-w-md h-full flex flex-col gap-6 pr-4 relative">
        <header className="flex items-center gap-3">
          <Activity className="text-blue-500 w-8 h-8" />
          <h1 className="text-3xl font-bold tracking-tight">City<span className="text-blue-500">Pulse</span></h1>
        </header>

        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md overflow-hidden flex flex-col">
          <h2 className="text-xl font-semibold mb-1">Live Updates</h2>
          <p className="text-gray-400 text-sm mb-2">
            Verified node logs via Go Gateway
          </p>

          {/* Inject the Feed here! */}
          <PulseFeed />
        </div>
      </aside>

      {/* Main Map Layout */}
      <section className="flex-1 h-full relative">
        <CityMap />
      </section>

      {/* Floating Action Button for the Sidebar */}
      <SubmitReportButton />
    </main>
  );
}
