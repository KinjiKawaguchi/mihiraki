# Store listing (English)

## Description

Review Markdown changes in GitHub pull requests the way they read: rendered, side by side, with the old version on the left and the new one on the right — and comment on them right there.

For Markdown, GitHub's rich diff overlays both versions in a single view and does not take review comments. Mihiraki takes its place when you switch a changed Markdown file to the rich diff on a pull request's "Files changed" tab, following GitHub's own split / unified setting.

• Split layout: both versions rendered and aligned block by block (headings, paragraphs, lists, tables)
• Unified layout: one column, with the changes marked in place
• Changed words highlighted inside each block (character by character for Japanese and Chinese)
• Hover over a block and press "+" to comment, or drag to select a range, as in GitHub's own diff
• Comments are ordinary GitHub review comments: post one right away, or add it to your pending review
• Existing review threads are shown beside the text they refer to
• Mermaid diagrams are drawn as GitHub draws them, the old and new versions side by side
• Uses the GitHub session you are already signed in with: no token, and the only permission is access to github.com
• No data collection: the extension talks only to GitHub (github.com, and GitHub's own diagram renderer)
• English and Japanese

Open source (MIT): https://github.com/KinjiKawaguchi/mihiraki

## Category

Developer Tools

## Privacy practices

**Single purpose**: Show the Markdown files changed in a GitHub pull request rendered side by side (before and after), so they can be reviewed and commented on in place.

**Host permission (content scripts on https://github.com/*)**: The extension adds the side-by-side view to pull request pages on github.com. It reads the changed files and review threads, and posts the comments the user writes, through github.com with the user's signed-in session. Mermaid diagrams are drawn in frames of GitHub's rendering service (viewscreen.githubusercontent.com), as on GitHub's own page. It runs on no other site.

**Remote code**: No. All code is packaged with the extension. The diagram frames are GitHub's own pages, isolated from the extension, as GitHub embeds them.

**Data usage**: The extension collects none of the listed data. It does not transmit data to the developer or third parties; comments are sent only to github.com when the user posts them, and the code of mermaid diagrams only to GitHub's rendering service to draw them.
