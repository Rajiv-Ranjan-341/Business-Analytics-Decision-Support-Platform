import { useLayoutEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  Users,
  Package,
  Search,
  SlidersHorizontal,
  Bot,
  Printer,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload data' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecasting' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/diagnosis', icon: Search, label: 'Diagnosis' },
  { to: '/simulator', icon: SlidersHorizontal, label: 'What-if' },
  { to: '/assistant', icon: Bot, label: 'Assistant' },
  { to: '/summary', icon: Printer, label: 'Summary' },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  const markerRef = useRef(null);

  const activeIndex = navItems.findIndex((item) => pathname.startsWith(item.to));

  // The sticker is one element that moves, rather than eight that light up, so
  // the eye can follow it from the page you left to the page you opened.
  //
  // Measured with viewport rects rather than offsetTop: offsetTop is relative to
  // whichever ancestor happens to be positioned, so it silently disagrees with
  // the marker's own origin the moment a wrapper gains `relative`.
  useLayoutEffect(() => {
    const marker = markerRef.current;
    const nav = navRef.current;
    const el = itemRefs.current[activeIndex];
    if (!marker || !nav) return;
    if (!el) {
      marker.style.opacity = '0';
      return;
    }
    const navBox = nav.getBoundingClientRect();
    const itemBox = el.getBoundingClientRect();
    marker.style.opacity = '1';
    marker.style.height = `${itemBox.height}px`;
    marker.style.transform = `translateY(${itemBox.top - navBox.top}px)`;
  }, [activeIndex, pathname]);

  return (
    <aside className="flex min-h-screen w-60 shrink-0 flex-col bg-ink text-paper print:hidden">
      <div className="border-b border-paper/15 px-5 py-5">
        <Link
          to="/"
          className="font-display text-2xl font-bold tracking-tight text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sticker"
        >
          BizOptAI
        </Link>
        <p className="mt-1 text-xs text-paper/60">What your shelf actually earns</p>
      </div>

      <nav ref={navRef} className="relative flex-1 px-3 py-4">
        <span
          ref={markerRef}
          aria-hidden="true"
          className="nav-marker pointer-events-none absolute top-0 left-3 z-0 w-[calc(100%-1.5rem)] bg-sticker opacity-0"
        />

        <div className="space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }, i) => (
            <NavLink
              key={to}
              to={to}
              ref={(node) => {
                itemRefs.current[i] = node;
              }}
              className={({ isActive }) =>
                `relative z-10 flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sticker ${
                  isActive ? 'font-semibold text-ink' : 'text-paper/75 hover:text-paper'
                }`
              }
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-paper/15 px-5 py-4 text-xs text-paper/55">
        Reading one dataset at a time. No login yet.
      </div>
    </aside>
  );
}
