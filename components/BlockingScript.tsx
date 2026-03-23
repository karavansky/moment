/**
 * Blocking script component to prevent FOUC (Flash of Unstyled Content)
 * This runs synchronously before React hydration to apply theme and sidebar state
 */

interface BlockingScriptProps {
  initialSidebarExpanded: boolean
}

export function BlockingScript({ initialSidebarExpanded }: BlockingScriptProps) {
  // Generate the script content
  const scriptContent = `(function(){try{const theme=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(theme);const sidebarExpanded=localStorage.getItem('sidebar-expanded');const initialExpanded=${JSON.stringify(initialSidebarExpanded)};const isExpanded=sidebarExpanded!==null?sidebarExpanded==='true':initialExpanded;if(!isExpanded){document.documentElement.classList.add('sidebar-collapsed');}}catch(e){}})();`

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      suppressHydrationWarning
    />
  )
}
