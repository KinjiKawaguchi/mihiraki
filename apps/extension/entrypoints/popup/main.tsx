import { render } from "preact";
import { languageSlot } from "../../src/settings/language-storage";
import { SettingsPopup } from "../../src/settings/SettingsPopup";
import "./style.css";

const app = document.getElementById("app");
if (app)
  render(<SettingsPopup slot={languageSlot} preferredLanguages={navigator.languages} />, app);
