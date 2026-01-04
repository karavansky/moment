export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "StarText dashboard",
  description: "Make beautiful websites regardless of your design experience.",
  navItems: [
    {
      label: "Bereinigung",
      href: "/clean",
    },
    {
      label: "Logs",
      href: "/logs",
    },

  ],
  navMenuItems: [
    {
      label: "Profile",
      href: "/profile",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Projects",
      href: "/projects",
    },
    {
      label: "Team",
      href: "/team",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Settings",
      href: "/settings",
    },
    {
      label: "Help & Feedback",
      href: "/help-feedback",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
  links: {
    gitlab: "https://gitlab.infas.de/it-entwicklung/startext-dashboard",
    twitter: "https://twitter.com/hero_ui",
    docs: "https://gitlab.infas.de/it-entwicklung/startext-dashboard",
    discord: "https://discord.gg/9b6yyZKmH4",
    login: "/login",
    logs: "/logs",
  },
};
