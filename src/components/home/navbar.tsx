import { useState } from 'react';
import { GalleryVerticalEnd } from 'lucide-react';
import { LoginForm } from '@/components/login-form';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { authClient } from '@/lib/auth-client';
import { Link } from '@tanstack/react-router';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const scrollToSection = (elementId: string) => {
    setIsMenuOpen(false); // Close mobile menu if open
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <nav className="bg-white/10 text-white p-4 backdrop-blur-md fixed w-full z-50">
      <div className="container mx-auto flex justify-between items-center">
        <button 
          onClick={() => scrollToSection('header')} 
          className="text-2xl font-bold hover:text-gray-200 transition-colors"
        >
          WEMSP
        </button>

        {/* Mobile menu button */}
        <button
          className="lg:hidden text-white focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Desktop menu */}
        <div className="hidden lg:flex space-x-8">
          <button 
            onClick={() => scrollToSection('header')} 
            className="hover:text-gray-200 transition-colors font-medium"
          >
            Home
          </button>
          <button 
            onClick={() => scrollToSection('about')} 
            className="hover:text-gray-200 transition-colors font-medium"
          >
            About Us
          </button>
          <button 
            onClick={() => scrollToSection('services')} 
            className="hover:text-gray-200 transition-colors font-medium"
          >
            Services
          </button>
          <button 
            onClick={() => scrollToSection('footer')} 
            className="hover:text-gray-200 transition-colors font-medium"
          >
            Contact Us
          </button>
          {session ? (
            <Link
              to="/app/dashboard"
              className="bg-white text-black px-4 py-1 rounded-full hover:bg-gray-200 transition-colors font-medium"
            >
              Dashboard
            </Link>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <button className="bg-white text-black px-4 py-1 rounded-full hover:bg-gray-200 transition-colors font-medium">
                  Login
                </button>
              </DialogTrigger>
              <DialogContent className="p-0 gap-0 max-w-[400px]">
                <div className="flex items-center gap-2 self-center font-medium p-6 pb-0">
                  <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  WEMSP
                </div>
                <div className="p-6 pt-4">
                  <LoginForm className="gap-4" />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-black/90 backdrop-blur-md p-4 flex flex-col space-y-4">
            <button 
              onClick={() => scrollToSection('header')} 
              className="hover:text-gray-200 transition-colors font-medium text-left"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('about')} 
              className="hover:text-gray-200 transition-colors font-medium text-left"
            >
              About Us
            </button>
            <button 
              onClick={() => scrollToSection('services')} 
              className="hover:text-gray-200 transition-colors font-medium text-left"
            >
              Services
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="hover:text-gray-200 transition-colors font-medium text-left"
            >
              Contact Us
            </button>
            {session ? (
              <Link
                to="/app/dashboard"
                className="bg-white text-black px-4 py-1 rounded-full hover:bg-gray-200 transition-colors font-medium text-center block"
              >
                Dashboard
              </Link>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="bg-white text-black px-4 py-1 rounded-full hover:bg-gray-200 transition-colors font-medium text-center w-full">
                    Login
                  </button>
                </DialogTrigger>
                <DialogContent className="p-0 gap-0 max-w-[400px]">
                  <div className="flex items-center gap-2 self-center font-medium p-6 pb-0">
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                      <GalleryVerticalEnd className="size-4" />
                    </div>
                    WEMSP
                  </div>
                  <div className="p-6 pt-4">
                    <LoginForm className="gap-4" />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 