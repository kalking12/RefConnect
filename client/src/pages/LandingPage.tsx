import { PROCEDURE_SPECIALTIES, SURGERY_TYPES } from "@shared/readiness";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  HeartPulse,
  LockKeyhole,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import "./landing.css";

const TEAM = [
  { name: "Khalid Osinusi", image: "/site/team-khalid-osinusi.webp" },
  { name: "Morayo Akinbile", image: "/site/team-morayo-akinbile.webp" },
] as const;

function Finder() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [showAll, setShowAll] = useState(false);

  const matches = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return SURGERY_TYPES.filter(procedure => {
      const matchesSpecialty = !specialty || procedure.specialty === specialty;
      const matchesSearch =
        !search ||
        [procedure.name, procedure.shortName, procedure.specialty, procedure.description]
          .some(value => value.toLocaleLowerCase().includes(search));
      return matchesSpecialty && matchesSearch;
    });
  }, [query, specialty]);

  const selected = matches.find(procedure => procedure.id === selectedId) ?? null;
  const visible = showAll ? matches : matches.slice(0, 6);

  return (
    <div className="rc-finder">
      <div className="rc-finder__browse">
        <div className="rc-finder__topline">
          <span className="rc-step">01 / Select a procedure</span>
          <SlidersHorizontal size={20} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div className="rc-finder__fields">
          <div className="rc-finder__field rc-finder__field--search">
            <label htmlFor="rc-procedure-query">Search by procedure</label>
            <div className="rc-input-wrap">
              <Search size={19} aria-hidden="true" />
              <input
                id="rc-procedure-query"
                type="search"
                value={query}
                onChange={event => { setQuery(event.target.value); setShowAll(false); }}
                placeholder="e.g. caesarean section"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="rc-finder__field rc-finder__field--specialty">
            <label htmlFor="rc-specialty">Specialty</label>
            <select
              id="rc-specialty"
              value={specialty}
              onChange={event => { setSpecialty(event.target.value); setShowAll(false); }}
            >
              <option value="">All specialties</option>
              {PROCEDURE_SPECIALTIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="rc-finder__results-header">
          <h3>Procedures</h3>
          <span role="status" aria-live="polite">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </span>
        </div>
        {matches.length ? (
          <>
            <ul className="rc-procedures" aria-label="Matching procedures">
              {visible.map((procedure, index) => (
                <li key={procedure.id}>
                  <button
                    type="button"
                    className={`rc-procedure${selected?.id === procedure.id ? " rc-procedure--selected" : ""}`}
                    aria-pressed={selected?.id === procedure.id}
                    onClick={() => setSelectedId(procedure.id)}
                  >
                    <span className="rc-procedure__index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rc-procedure__text">
                      <strong>{procedure.name}</strong>
                      <small>{procedure.specialty}</small>
                    </span>
                    <span className="rc-procedure__indicator" aria-hidden="true">
                      {selected?.id === procedure.id ? <Check size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {matches.length > 6 && (
              <button
                type="button"
                className="rc-finder__more"
                onClick={() => setShowAll(current => !current)}
                aria-expanded={showAll}
              >
                {showAll ? "Show fewer procedures" : `Show all ${matches.length} procedures`}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            )}
          </>
        ) : (
          <div className="rc-finder__empty" role="status">
            <Search size={22} aria-hidden="true" />
            <strong>No matching procedures</strong>
            <p>Try another name or choose all specialties.</p>
          </div>
        )}
      </div>

      <aside className="rc-finder__next" aria-label="Continue to hospital search">
        <div className="rc-finder__next-photo" aria-hidden="true" />
        <span className="rc-step">02 / Explore hospitals</span>
        <div className="rc-finder__next-body" aria-live="polite">
          <div className="rc-finder__next-icon"><ClipboardList size={29} strokeWidth={1.6} aria-hidden="true" /></div>
          <p className="rc-overline">YOUR SELECTED PROCEDURE</p>
          <h3>{selected?.name ?? "Select a procedure"}</h3>
          <p>
            {selected
              ? `Explore hospital information for ${selected.shortName.toLocaleLowerCase()} after signing in. A clinician must confirm current resources directly with the receiving facility.`
              : "Choose a procedure on the left to continue to the hospital search."}
          </p>
        </div>
        {selected && (
          <Link className="rc-button rc-button--light rc-finder__go" href={`/search?procedure=${encodeURIComponent(selected.id)}`}>
            View hospitals <ArrowRight size={19} aria-hidden="true" />
          </Link>
        )}
        <p className="rc-finder__privacy"><LockKeyhole size={15} aria-hidden="true" /> Sign in is required for hospital details and referrals.</p>
      </aside>
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="rc-land">
      <a className="rc-land__skip" href="#main-content">Skip to content</a>
      <header className="rc-land__header">
        <div className="rc-land__header-inner">
          <a className="rc-brand" href="#intro" aria-label="RefConnect, back to introduction">
            <img src="/brand/refconnect-mark.webp" width="42" height="42" alt="" aria-hidden="true" />
            <span>Ref<span>Connect</span></span>
          </a>
          <nav className="rc-land__nav" aria-label="Main navigation">
            <a href="#intro">Introduction</a>
            <a href="#find">Find a procedure</a>
            <a href="#about">About us</a>
          </nav>
          <Link className="rc-land__portal" href="/admin">Admin portal <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
      </header>

      <main id="main-content">
        <section className="rc-hero" id="intro" aria-labelledby="rc-intro-title">
          <div className="rc-hero__images" aria-hidden="true">
            <div className="rc-hero__image rc-hero__image--first" />
            <div className="rc-hero__image rc-hero__image--second" />
            <div className="rc-hero__image rc-hero__image--third" />
            <div className="rc-hero__image rc-hero__image--fourth" />
            <div className="rc-hero__image rc-hero__image--fifth" />
          </div>
          <div className="rc-hero__scrim" aria-hidden="true" />
          <div className="rc-hero__inner">
            <div className="rc-hero__copy">
              <p className="rc-eyebrow"><span className="rc-eyebrow__line" /> Universal referral network</p>
              <h1 id="rc-intro-title">Clearer pathways for <em>complex care.</em></h1>
              <p className="rc-hero__lead">
                RefConnect is a referral workflow for clinicians in Nigeria: find a procedure, review facility information and plan the next step with greater clarity.
              </p>
              <a className="rc-button rc-button--gold" href="#find">Explore procedures <ArrowRight size={19} aria-hidden="true" /></a>
            </div>
            <div className="rc-hero__foot">
              <p><span className="rc-hero__foot-dot" /> Designed for care teams</p>
              <a href="#find">Discover the platform <ArrowDown size={18} aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <section className="rc-find rc-section" id="find" aria-labelledby="rc-find-title">
          <div className="rc-section__inner">
            <div className="rc-section__heading rc-find__heading">
              <div>
                <p className="rc-eyebrow rc-eyebrow--dark"><span className="rc-eyebrow__line" /> The procedure finder · 02</p>
                <h2 id="rc-find-title">Begin with the <span>care that’s needed.</span></h2>
              </div>
              <p>Search for a procedure first. Continue to the secure hospital workspace to review facility records and prepare a referral.</p>
            </div>
            <Finder />
            <p className="rc-find__note">
              Demonstration hospital records may be present in the signed-in workspace. Readiness figures are illustrative until facility information has been verified; this page does not show live availability or send a referral.
            </p>
          </div>
        </section>

        <section className="rc-about rc-section" id="about" aria-labelledby="rc-about-title">
          <div className="rc-section__inner">
            <div className="rc-about__story">
              <div className="rc-about__image-wrap">
                <img src="/site/operating-room.webp" alt="An operating room prepared for surgery" loading="lazy" decoding="async" width="1200" height="800" />
                <span>Care works better when information moves with it.</span>
              </div>
              <div className="rc-about__copy">
                <p className="rc-eyebrow rc-eyebrow--dark"><span className="rc-eyebrow__line" /> Our purpose · 03</p>
                <h2 id="rc-about-title">A better connection between <span>clinical need and capability.</span></h2>
                <p>RefConnect is being designed around a familiar challenge: clinicians need reliable information when referring a patient for specialist care. The platform aims to make procedures, facility capabilities and referral steps easier to review in one place.</p>
                <p>Our initial focus is Kano, Nigeria. Hospital information must be confirmed and maintained by the participating facilities before it can guide real care decisions.</p>
                <a href="#find" className="rc-about__text-link">See the procedure finder <ArrowRight size={18} aria-hidden="true" /></a>
              </div>
            </div>

            <div className="rc-principles" aria-label="How RefConnect is designed to help">
              <div><Search size={26} strokeWidth={1.7} aria-hidden="true" /><span>01</span><h3>Find the care need</h3><p>Start with a procedure rather than a long list of facilities.</p></div>
              <div><HeartPulse size={26} strokeWidth={1.7} aria-hidden="true" /><span>02</span><h3>Review capabilities</h3><p>Compare the facility information available to your care team.</p></div>
              <div><ClipboardList size={26} strokeWidth={1.7} aria-hidden="true" /><span>03</span><h3>Prepare the handoff</h3><p>Keep the next referral step clear and deliberate.</p></div>
            </div>

            <div className="rc-team" aria-labelledby="rc-team-title">
              <div className="rc-team__intro">
                <div>
                  <p className="rc-eyebrow rc-eyebrow--dark"><span className="rc-eyebrow__line" /> The people behind RefConnect</p>
                  <h2 id="rc-team-title">Meet the founders.</h2>
                </div>
                <p>Osinusi and Morayo are building clearer referral pathways with care teams in mind.</p>
              </div>
              <ul className="rc-team__grid">
                {TEAM.map(person => (
                  <li className="rc-team__member" key={person.name}>
                    <div className="rc-team__photo"><img src={person.image} alt={`Portrait of ${person.name}`} loading="lazy" decoding="async" width="640" height="800" /></div>
                    <div className="rc-team__person"><span>Co-founder</span><h3>{person.name}</h3></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="rc-footer">
        <div className="rc-footer__inner">
          <div className="rc-footer__lead">
            <a className="rc-brand rc-brand--footer" href="#intro" aria-label="RefConnect, back to introduction">
              <img src="/brand/refconnect-mark.webp" width="44" height="44" alt="" aria-hidden="true" />
              <span>Ref<span>Connect</span></span>
            </a>
            <p>Clearer pathways for complex care. A referral workflow in development for clinical teams in Nigeria.</p>
          </div>
          <div className="rc-footer__column"><h2>Explore</h2><a href="#find">Procedure finder</a><a href="#about">Our purpose and founders</a></div>
          <div className="rc-footer__column"><h2>Access</h2><Link href="/admin">Admin portal</Link><p>Sign in with a verified Google account to use hospital search. Administrator access is granted separately.</p></div>
        </div>
        <div className="rc-footer__bottom"><span>© {new Date().getFullYear()} RefConnect</span><span>Designed for clearer care pathways.</span><a href="#intro">Back to top ↑</a></div>
      </footer>
    </div>
  );
}
