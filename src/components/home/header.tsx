import Arrow from "../ui/arrow";
import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/lib/i18n/context";

export default function Header() {
  const { t } = useLanguage();
  return (
    <div
        id="header"
        className="header bg-cover bg-center w-full h-screen relative min-h-screen"
        style={{ backgroundImage: "url('/assets/sharia-court.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-white text-5xl font-bold mb-4">
            {t('header.title')}
          </h1>
          <h2 className="text-white text-5xl font-bold mb-8">
            {t('header.subtitle')}
          </h2>
          <p className="text-white text-xl font-light mb-8 max-w-2xl">
            {t('header.description')}
          </p>
          <Link to="/" className="bg-white text-black px-8 py-4 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 text-lg font-medium">
            {t('header.getStarted')}
            <Arrow />
          </Link>
        </div>
      </div>
  );
}