import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  PenLine,
  Compass,
  UserCheck,
  ArrowRight,
  Menu,
  X,
  Heart,
  Send,
  HelpCircle,
  AlertCircle,
  ChevronDown
} from "lucide-react";
import heroIllustration from "../assets/hero-illustration.jpg";
import "./MarketingHome.css";

export default function MarketingHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email && contactForm.message) {
      setContactSubmitted(true);
      setContactForm({ name: "", email: "", message: "" });
    }
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="marketing-page" id="top">
      {/* Background Organic Blobs */}
      <div className="marketing-blob-bg" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
      </div>

      {/* ============================================================
          HEADER
          ============================================================ */}
      <header className="marketing-header">
        <div className="marketing-container">
          <div className="marketing-header-inner">
            <a href="#top" onClick={(e) => scrollToSection(e, "top")} className="marketing-brand">
              <div className="marketing-brand-mark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9 4.97 0 9-4.03 9-9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <div className="marketing-brand-text">
                <span className="marketing-brand-title">MindMirror</span>
                <span className="marketing-brand-tagline">Compassionate Companion</span>
              </div>
            </a>

            <nav className={`marketing-nav ${mobileMenuOpen ? "open" : ""}`} aria-label="Main Navigation">
              <a href="#about" onClick={(e) => scrollToSection(e, "about")} className="marketing-nav-link">About</a>
              <a href="#features" onClick={(e) => scrollToSection(e, "features")} className="marketing-nav-link">Features</a>
              <a href="#resources" onClick={(e) => scrollToSection(e, "resources")} className="marketing-nav-link">Resources</a>
              <a href="#contact" onClick={(e) => scrollToSection(e, "contact")} className="marketing-nav-link">Contact</a>
            </nav>

            <div className="marketing-header-actions">
              <Link to="/login" className="btn-nav-login">Log In</Link>
              <Link to="/register" className="btn-nav-signup">Get Started</Link>
              <button
                type="button"
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="marketing-hero" id="hero">
        <div className="marketing-container">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                A Safe Space for Your Thoughts
              </div>

              <h1 className="hero-headline">
                Reflect deeper, notice patterns, and{" "}
                <span className="hero-headline-accent">heal with clarity</span>.
              </h1>

              <p className="hero-subhead">
                Private daily journaling meets intelligent emotional insight. Notice shifts in your wellbeing over time and connect directly with verified mental health specialists when you need extra support.
              </p>

              <div className="hero-actions">
                <Link to="/register" className="btn-hero-primary">
                  Start Your Journey <ArrowRight size={18} />
                </Link>
                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e, "features")}
                  className="btn-hero-secondary"
                >
                  Learn More <ChevronDown size={17} />
                </a>
              </div>

              <div className="hero-trust-badges">
                <div className="trust-badge">
                  <div className="trust-badge-icon">
                    <ShieldCheck />
                  </div>
                  <div>
                    <span className="trust-badge-text">Private & Encrypted</span>
                    <span className="trust-badge-desc">Your journals stay strictly confidential</span>
                  </div>
                </div>

                <div className="trust-badge">
                  <div className="trust-badge-icon">
                    <CheckCircle2 />
                  </div>
                  <div>
                    <span className="trust-badge-text">Verified Providers</span>
                    <span className="trust-badge-desc">Accredited therapists & psychiatrists</span>
                  </div>
                </div>

                <div className="trust-badge">
                  <div className="trust-badge-icon">
                    <Sparkles />
                  </div>
                  <div>
                    <span className="trust-badge-text">Pattern Detection</span>
                    <span className="trust-badge-desc">Gentle mood trend insights</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-art-card">
                <div className="hero-image-wrapper">
                  <img
                    src={heroIllustration}
                    alt="Warm illustration of a person gently journaling and reflecting in a peaceful setting"
                    className="hero-illustration-img"
                    loading="eager"
                  />
                </div>

                {/* Decorative Static Mockup Card (Prompt Decision: Decorative static only, no API call) */}
                <div className="hero-floating-card" aria-hidden="true">
                  <div className="floating-card-icon">
                    <Sparkles />
                  </div>
                  <div className="floating-card-content">
                    <span className="floating-card-label">Mood Pattern Detected</span>
                    <span className="floating-card-title">Upward trend over 7 days</span>
                    <span className="floating-card-action">View Supportive Insights →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES SECTION (#features)
          ============================================================ */}
      <section className="marketing-features" id="features">
        <div className="marketing-container">
          <div className="section-header">
            <span className="section-eyebrow">Honest, Built Capabilities</span>
            <h2 className="section-title">Designed to gently support every step</h2>
            <p className="section-subtitle">
              No clutter or overwhelming metrics. MindMirror focuses on thoughtful tools that help you listen to yourself and find the right support.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-badge">
                <PenLine />
              </div>
              <h3 className="feature-title">Daily Journaling</h3>
              <p className="feature-description">
                Write freely in a quiet, judgment-free space. Track your mood, express thoughts as they come, and build a consistent reflection habit.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <Sparkles />
              </div>
              <h3 className="feature-title">Pattern Detection</h3>
              <p className="feature-description">
                MindMirror notices subtle shifts in your emotional trends over time, ensuring rising stress or encouraging recovery never quietly goes unnoticed.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <Compass />
              </div>
              <h3 className="feature-title">Guided Resources</h3>
              <p className="feature-description">
                Access clinically grounded psychoeducation, guided mindfulness exercises, and compassionate coping strategies tailored to what you are working through.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-badge">
                <UserCheck />
              </div>
              <h3 className="feature-title">Connect with a Specialist</h3>
              <p className="feature-description">
                Book confidential sessions directly with verified, licensed doctors and psychiatrists specialized in anxiety, trauma recovery, depression, and relationships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PUBLIC RESOURCES SECTION (#resources)
          ============================================================ */}
      <section className="marketing-resources" id="resources">
        <div className="marketing-container">
          <div className="section-header">
            <span className="section-eyebrow">Public Guidance Preview</span>
            <h2 className="section-title">Evidence-based psychoeducation & tools</h2>
            <p className="section-subtitle">
              A sample preview of the supportive material available. Log into your account to unlock your complete, personalized library.
            </p>
          </div>

          <div className="resources-grid">
            <div className="resource-preview-card">
              <span className="resource-tag tag-anxiety">Anxiety & Stress</span>
              <h4 className="resource-title">4-7-8 Calming Breathwork</h4>
              <p className="resource-desc">
                A simple somatic exercise to de-escalate acute anxiety by slowing the heart rate and grounding the nervous system.
              </p>
            </div>

            <div className="resource-preview-card">
              <span className="resource-tag tag-trauma">Trauma Recovery</span>
              <h4 className="resource-title">Creating Inner Safety</h4>
              <p className="resource-desc">
                Gentle pacing methods and sensory anchors for grounding when past trauma triggers hyper-vigilance.
              </p>
            </div>

            <div className="resource-preview-card">
              <span className="resource-tag tag-depression">Depression & Mood</span>
              <h4 className="resource-title">Micro-Steps for Low Days</h4>
              <p className="resource-desc">
                Compassionate behavioral activation strategies for days when getting out of bed feels like an overwhelming mountain.
              </p>
            </div>

            <div className="resource-preview-card">
              <span className="resource-tag tag-relationships">Relationships</span>
              <h4 className="resource-title">Clear & Kind Boundaries</h4>
              <p className="resource-desc">
                Practical scripts for communicating your emotional capacity without guilt, defensiveness, or burnout.
              </p>
            </div>
          </div>

          <div className="resource-callout-banner">
            <div className="callout-content">
              <h4>Unlock Your Tailored Patient Library</h4>
              <p>
                Our gated resource library adapts to your journal trends, presenting exercises matched to what you’re currently experiencing.
              </p>
            </div>
            <Link to="/register" className="btn-resource-cta">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          ABOUT SECTION (#about)
          ============================================================ */}
      <section className="marketing-about" id="about">
        <div className="marketing-container">
          <div className="about-card">
            <div className="about-text">
              <span className="section-eyebrow">Why MindMirror Exists</span>
              <h3>Extending a supportive hand when you need it most</h3>
              <p>
                Mental wellbeing is not a linear checklist. Traditional mental health applications often feel sterile, clinical, or detached — like filling out intake forms at a cold front desk.
              </p>
              <p>
                We built MindMirror to bridge private, compassionate daily self-reflection with verified, professional clinical care. Whether you are reflecting late at night or scheduling a session with an accredited psychiatrist, you always have a safe space to be heard.
              </p>
              <p className="about-quote">
                "You don’t have to carry heavy days all by yourself."
              </p>
            </div>

            <div className="about-highlights">
              <div className="about-highlight-item">
                <div className="about-highlight-icon">
                  <Heart />
                </div>
                <div className="about-highlight-content">
                  <h5>Compassion, Not Judgement</h5>
                  <p>Designed with warmth, soothing palettes, and respect for your emotional boundaries.</p>
                </div>
              </div>

              <div className="about-highlight-item">
                <div className="about-highlight-icon">
                  <UserCheck />
                </div>
                <div className="about-highlight-content">
                  <h5>Real Verified Care</h5>
                  <p>Direct access to licensed psychologists and psychiatrists, backed by verified credentials.</p>
                </div>
              </div>

              <div className="about-highlight-item">
                <div className="about-highlight-icon">
                  <ShieldCheck />
                </div>
                <div className="about-highlight-content">
                  <h5>Uncompromising Privacy</h5>
                  <p>Your reflections are your own. We do not sell your personal reflections or health records.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CONTACT & CRISIS SECTION (#contact)
          ============================================================ */}
      <section className="marketing-contact" id="contact">
        <div className="marketing-container">
          <div className="contact-grid">
            <div className="contact-info-panel">
              <div>
                <span className="section-eyebrow" style={{ color: "#FF80BF" }}>Support & Inquiries</span>
                <h3>We’re here to help</h3>
                <p>
                  Have a question about MindMirror, specialist onboarding, or need assistance with your account? Reach out anytime.
                </p>

                <div className="contact-channels">
                  <div className="contact-channel-item">
                    <div className="contact-channel-icon">
                      <HelpCircle />
                    </div>
                    <div>
                      <div>Direct Email Support</div>
                      <a href="mailto:support@mindmirror.ai">support@mindmirror.ai</a>
                    </div>
                  </div>

                  <div className="contact-channel-item">
                    <div className="contact-channel-icon">
                      <ShieldCheck />
                    </div>
                    <div>
                      <div>Privacy & Security</div>
                      <a href="mailto:privacy@mindmirror.ai">privacy@mindmirror.ai</a>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "28px", fontSize: "12.5px", color: "rgba(255, 255, 255, 0.65)" }}>
                MindMirror AI • Early Access Release
              </div>
            </div>

            <div className="contact-form-card">
              <h4>Send us a message</h4>
              {contactSubmitted ? (
                <div className="contact-success-notice">
                  <CheckCircle2 size={20} />
                  <span>Thank you! Your message has been received. Our support team will reply shortly.</span>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="contact-form">
                  <div className="form-group-field">
                    <label htmlFor="contact-name">Your Name</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group-field">
                    <label htmlFor="contact-email">Email Address</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group-field">
                    <label htmlFor="contact-message">Message</label>
                    <textarea
                      id="contact-message"
                      rows="4"
                      required
                      placeholder="How can we assist you?"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn-contact-submit">
                    Send Message <Send size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Crisis Safety Notice Banner */}
          <div className="crisis-safety-banner" role="alert">
            <div className="crisis-icon">
              <AlertCircle size={28} />
            </div>
            <div className="crisis-text">
              <strong>Need immediate crisis support?</strong> MindMirror is a supportive self-reflection platform, not an emergency intervention service. If you or someone you know is in acute distress or experiencing thoughts of self-harm, please call or text <strong>988</strong> (USA & Canada Suicide & Crisis Lifeline) or text <strong>HOME to 741741</strong> to reach a crisis counselor 24/7.
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          STATS / EARLY ACCESS CTA BAR
          ============================================================ */}
      <section className="marketing-cta-bar">
        <div className="marketing-container">
          <div className="cta-bar-inner">
            <span className="cta-handwritten-lead">
              Every journey begins with a single honest reflection.
            </span>

            <h2 className="cta-title">
              Ready to start listening to your mind?
            </h2>

            <p className="cta-subtitle">
              Join MindMirror today. Experience private, intelligent self-reflection and direct connection to licensed mental health professionals.
            </p>

            <div className="cta-honest-badges">
              <div className="honest-badge-item">
                <Sparkles size={16} />
                <span>Now in Early Access</span>
              </div>
              <div className="honest-badge-item">
                <ShieldCheck size={16} />
                <span>100% Private & Free to Start</span>
              </div>
              <div className="honest-badge-item">
                <UserCheck size={16} />
                <span>Verified Provider Network</span>
              </div>
            </div>

            <div className="cta-button-group">
              <Link to="/register" className="btn-cta-main">
                Get Started Free <ArrowRight size={18} />
              </Link>
              <div className="cta-login-hint">
                Already have an account? <Link to="/login">Log In</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="marketing-footer">
        <div className="marketing-container">
          <div className="footer-top">
            <div className="marketing-brand">
              <div className="marketing-brand-mark" style={{ width: 32, height: 32 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9 4.97 0 9-4.03 9-9" />
                  <path d="M12 7v5l3 3" />
                </svg>
              </div>
              <div className="marketing-brand-text">
                <span className="marketing-brand-title" style={{ fontSize: 18 }}>MindMirror</span>
                <span className="marketing-brand-tagline">Compassionate Mental Health Companion</span>
              </div>
            </div>

            <div className="footer-nav">
              <a href="#about" onClick={(e) => scrollToSection(e, "about")}>About</a>
              <a href="#features" onClick={(e) => scrollToSection(e, "features")}>Features</a>
              <a href="#resources" onClick={(e) => scrollToSection(e, "resources")}>Resources</a>
              <a href="#contact" onClick={(e) => scrollToSection(e, "contact")}>Contact & Support</a>
              <Link to="/login">Log In</Link>
              <Link to="/register">Register</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              &copy; {new Date().getFullYear()} MindMirror AI. All rights reserved.
            </div>
            <div>
              Built for compassionate self-reflection and verified mental health care.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}