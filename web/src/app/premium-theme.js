// YapGitsin Premium Dark Soft Theme Configuration
const premiumTheme = {
  primary: '#7B61FF',    // Neon Purple
  secondary: '#FF8A00',  // Emergency Orange
  background: '#0F1219', // Deep Dark
  surface: '#1A1F2B',    // Card/Panel background
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  error: '#EF4444',
  success: '#22C55E',
  
  // Custom Gradients for Buttons
  purpleGradient: 'linear-gradient(135deg, #7B61FF 0%, #5E44FF 100%)',
  softGlow: '0px 0px 20px rgba(123, 97, 255, 0.3)',
};

// Global styles to match the Sitemap Template
const globalStyles = `
  .dark-soft-card {
    background: #1A1F2B;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    padding: 16px;
  }
  .sos-button {
    background: radial-gradient(circle, #FF4B2B 0%, #FF416C 100%);
    box-shadow: 0 0 30px rgba(255, 75, 43, 0.4);
  }
  .nav-blur {
    backdrop-filter: blur(20px);
    background: rgba(15, 18, 25, 0.85);
  }
`;
