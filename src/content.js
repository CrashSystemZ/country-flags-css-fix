// Source: https://github.com/talkjs/country-flag-emoji-polyfill
const replacementFontName = "Twemoji Country Flags";

// The id the element containing all overwritten font families.
const extentionStyleTagId = "country-flag-fixer-ext";

// Icon font classes that must never be overridden with Twemoji.
// These are appended as :not() exclusions to broad universal selectors.
const iconFontNotSelectors = [
  ':not([class^="gdi_"])',
  ':not([class*=" gdi_"])',
  ':not([class^="ri-"])',
  ':not([class*=" ri-"])',
  ':not([class^="fa-"])',
  ':not([class*=" fa-"])',
  ':not([class^="mdi-"])',
  ':not([class*=" mdi-"])',
  ':not([class^="icon-"])',
  ':not([class*=" icon-"])',
  ':not([class*="-icon-"])',
  ':not(.fas)',
  ':not(.far)',
  ':not(.fab)',
  ':not(.fal)',
  ':not(.fad)',
].join('');

const extractFontFamilyRules = () => 
{
  const fontFamilyRules = [];

  for (const sheet of document.styleSheets) {

    // Ignore the styles set by this extention.
    if (sheet.ownerNode.id == extentionStyleTagId) 
      continue;

    // Ignore any non-screen stylesheets.
    const sheetMediaBlacklist = ['print', 'speech', 'aural', 'braille', 'handheld', 'projection', 'tty'];
    if (sheetMediaBlacklist.includes(sheet.media.mediaText))
      continue;

    try {
      
      // Loop through every CSS selector in the stylesheet
      for (const rule of sheet.cssRules) {

        if (!rule.style || !rule.style?.fontFamily) 
          continue;

        // Skip rules without a selectorText (e.g. @font-face, @keyframes, @media)
        if (!rule.selectorText)
          continue;

        const selectorText = rule.selectorText;
        const fontFamily = rule.style.fontFamily;

        // The 'inherit' value cannot be combined with other fonts; ignore it.
        if (fontFamily == 'inherit')
          continue;

        // Already modified CSS selectors may be ignored.
        if (fontFamily.toLowerCase().includes(replacementFontName.toLowerCase())) 
          continue;

        fontFamilyRules.push({ selectorText, fontFamily });
      }
    }
    catch (e) {
      // Some stylesheets might not be accessible due to CORS restrictions; ignore them.
    }
  }

  return fontFamilyRules;
};

const createNewStyleTag = (fontFamilyRules) => 
{
  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.setAttribute("id", extentionStyleTagId);

  fontFamilyRules.forEach((rule) => {
    let selector = rule.selectorText;

    // Append icon-font exclusions to EVERY selector so icon elements are never matched
    // by ANY Twemoji rule, regardless of specificity. This handles cases like
    // ':lang(en) .bold' (specificity 0,1,1) which beats '[class^="ri-"]' (0,1,0).
    // For compound selectors ('a, b') we must append to each comma-separated part.
    selector = selector
      .split(',')
      .map(part => part.trim() + iconFontNotSelectors)
      .join(', ');

    // Set the Country Flags font as main property; set the original font(s) as 'fallback'
    style.textContent += `${selector} { font-family: '${replacementFontName}', ${rule.fontFamily} !important; }\n`;
  });

  // Restore icon fonts that were overridden by other (lower-specificity) rules.
  style.textContent += `
    [class^="gdi_"], [class*=" gdi_"] {
      font-family: 'SmartPortalFont' !important;
      font-style: normal !important;
    }
    [class^="ri-"], [class*=" ri-"] {
      font-family: 'remixicon' !important;
      font-style: normal !important;
    }
    .fas, .far, .fal, .fab, .fad,
    [class^="fa-"], [class*=" fa-"] {
      font-family: 'Font Awesome 6 Free', 'Font Awesome 5 Free', 'Font Awesome 5 Brands', 'FontAwesome' !important;
      font-style: normal !important;
    }
    [class^="material-icons"], [class*=" material-icons"] {
      font-family: 'Material Icons' !important;
      font-style: normal !important;
    }
    [class^="material-symbols"], [class*=" material-symbols"] {
      font-family: 'Material Symbols Outlined' !important;
      font-style: normal !important;
    }
    [class^="mdi-"], [class*=" mdi-"] {
      font-family: 'Material Design Icons' !important;
      font-style: normal !important;
    }
    [class^="icon-"], [class*=" icon-"],
    [class*="-icon-"] {
      font-family: inherit !important;
      font-style: normal !important;
    }
  `;

  return style;
};

const applyCustomFontStyles = () => 
{
  var existingSheet = document.getElementById(extentionStyleTagId);

  const fontFamilyRules = extractFontFamilyRules();
  const newStyleTag = createNewStyleTag(fontFamilyRules);

  // Completely rewrite the overriden styles, if applicable.
  if (existingSheet) {
    existingSheet.parentNode.removeChild(existingSheet);
  }

  if (document.head == null) 
    return;

  document.head.appendChild(newStyleTag);
};

const preserveCustomFonts = (element) => 
{
  if (element == undefined)
    return;

  // Ignore elements without style attribute or any font-family property.
  const inlineStyle = element.getAttribute('style');
  if (!inlineStyle || !inlineStyle.includes('font-family'))
    return;

  // Font family regex matching the font (group 1) and the !important modifier (group 2).
  const fontFamilyRegex = /font-family\s*:\s*([^;]+?)(\s*!important)?\s*(;|$)/;
  const match = fontFamilyRegex.exec(inlineStyle);
    
  // Cancel if there is no match for any reason.
  if (!match)
    return;

  const hasIsImportant = match[2] && match[2].includes('!important');
  if (hasIsImportant)
    return;

  const currentFontFamily = match[1].trim();
  element.style.setProperty('font-family', currentFontFamily, 'important');
}

// Observe the document for dynamically added styles
let lastStyleSheets = new Set(Array.from(document.styleSheets).map(sheet => sheet.href || sheet.ownerNode.textContent));
const observer = new MutationObserver((mutations) => 
{
  let stylesheetChanged = false;

  mutations.forEach(mutation => 
  {
    // Only focus on <link> and <style> elements.
    mutation.addedNodes.forEach(node => 
    {
      if (node.id === extentionStyleTagId)
        return;

      const isStylesheet = node.nodeName === 'LINK' && node.rel === 'stylesheet';
      const isStyleNode = node.nodeName === 'STYLE'
      if (!isStylesheet && !isStyleNode)
        return;

      const newStylesheetIdentifier = isStylesheet ? node.href : node.textContent;
      if (lastStyleSheets.has(newStylesheetIdentifier))
        return;

      stylesheetChanged = true;
      lastStyleSheets.add(newStylesheetIdentifier);
    });
  });

  if (stylesheetChanged) {
    applyCustomFontStyles();
  }

  // Preserve font families set using the style attribute on any HTML element.
  document.querySelectorAll('*').forEach(preserveCustomFonts);
});

// Observe the children of the document DOM-element and every newly added element
// This may be a <link> element in the head, or any <style> sheet in the document.
observer.observe(document, { childList: true, subtree: true });
