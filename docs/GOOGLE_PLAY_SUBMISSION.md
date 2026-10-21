# Google Play Submission Pack

This is the working source for Play Console fields. Revalidate it against the exact production AAB and current Play questionnaire before submission.

## Required Public Links

- Privacy policy: `https://snapshelf-legal.vercel.app/privacy/` (`EXPO_PUBLIC_PRIVACY_POLICY_URL` in the production build).
- Support website: `https://snapshelf-legal.vercel.app/` (`EXPO_PUBLIC_SUPPORT_URL` in the production build).
- Support email: `codecrafting.ltd@gmail.com` (`EXPO_PUBLIC_SUPPORT_EMAIL` in the production build); verify that the inbox is monitored under `docs/RELEASE_OPERATIONS.md`.
- Account deletion: `https://snapshelf-legal.vercel.app/delete-account/` is public without sign-in; enter this exact URL in the Play Console Data safety deletion form. See `docs/PUBLIC_SITE.md` for remaining operational checks.

Use the same privacy and support links in Settings and Play Console. `npm run release:verify-contact` blocks release verification when placeholders remain.

## Store Listing

App name (30-character limit):

> SnapShelf

Short description (80-character limit):

> Save visual inspiration, clear your tray, and organize ideas on a spatial board.

Full description:

> Turn scattered inspiration into a collection you can actually use.
>
> SnapShelf gives every saved idea a place. Import images or share links and text from other apps, process new items in The Tray, and arrange your collection into Shelves and Stacks on a visual Board.
>
> CAPTURE WITHOUT THE CLUTTER
> - Import images from your device
> - Share images, links, and text directly to SnapShelf
> - Add titles, thoughts, labels, and original-source links
>
> ORGANIZE YOUR WAY
> - Sort new inspiration in The Tray
> - Group Snaps into Shelves and Stacks
> - Arrange your collection on a spatial Board
> - Favorite, archive, search, filter, and rediscover saved ideas
>
> LOCAL-FIRST IMAGES
> Your images stay on the device where you add them. Account metadata such as titles, notes, labels, source links, and organization syncs securely through your account. Images are not currently synced between devices and may be lost if the app is uninstalled or its data is cleared.
>
> BUILT FOR FOCUS
> SnapShelf has no ads, public feed, likes, or follower counts. It is a private workspace for collecting and connecting ideas.

Category: `Productivity` (preferred) or `Art & Design` if product positioning changes.

Tags to consider: productivity, organization, design tools, note taking, inspiration.

## Screenshots

Capture at least four phone screenshots from the exact release build using realistic, rights-cleared sample content and no personal information.

| Order | Screen | Caption | State to show |
| --- | --- | --- | --- |
| 1 | Board | Your inspiration, connected | Populated Board with several Shelves and one Stack |
| 2 | The Tray | Capture now. Organize when ready. | New unfiled Snaps and bulk actions |
| 3 | Shelf | Build collections that stay useful | A polished Shelf with titles and labels |
| 4 | Library | Find any idea again | Search or filter with varied results |
| 5 | Share import | Save from the apps you already use | Android share flow into SnapShelf |
| 6 | Dark mode | A focused workspace, day or night | Populated Board or Library in dark mode |

Requirements:

- Phone screenshots must be JPEG or 24-bit PNG without alpha, 320-3840 px, and no side more than twice the other side; verify current Play requirements at upload time.
- Use one consistent device frame and caption system if adding marketing overlays.
- Do not show placeholder contacts, debug tools, email addresses, copyrighted brand marks without permission, or image content without store-marketing rights.
- Add a 1024 x 500 feature graphic. Keep key text and marks away from crop-prone edges.
- Verify app icon rendering from the Play-delivered build.

## Data Safety

Expected top-level answers, subject to production-provider verification:

- Does the app collect or share required user data types? `Yes, collects data`.
- Is all collected user data encrypted in transit? `Yes`, after confirming production uses HTTPS only.
- Can users request deletion? `Yes`, through Settings and the required public deletion page.
- Is data shared? `No` only if Supabase is contractually acting solely as a service provider; otherwise disclose the transfer.
- Independent security review: `No`, unless one is completed before submission.
- Ads: `No`.

Declare these collected data types:

| Play data type | Required? | Purpose | Notes |
| --- | --- | --- | --- |
| Personal info - Email address | Required | App functionality, account management, security | Supabase Auth and profile record |
| Personal info - Name | Optional | App functionality, personalization, account management | Optional display name |
| Personal info - User IDs | Required | App functionality, account management, security | Supabase account ID |
| App activity - App interactions | Mixed | App functionality, personalization | Favorites, archive state, organization actions and timestamps |
| Other user-generated content | Optional | App functionality, personalization | Titles, notes, labels, source links, Shelf/Stack names and Board organization |
| Device or other IDs | Required/generated | App functionality, security | Random installation ID; not an advertising or hardware ID |

Current image contents are processed and stored only on-device, so they are not remotely collected by the current release. Relative local-media path metadata is synced. Reclassify Photos as collected immediately if cloud image upload is enabled. Saved source URLs are user-submitted content, not passive browsing history; confirm that interpretation against the current questionnaire.

Data is not used for advertising, marketing, analytics, creditworthiness, or cross-app tracking. There is no sale of data. Verify and document Supabase IP/log/backup retention before filing.

## Content Rating

Questionnaire facts:

- App type: productivity and private organization; not a game.
- Violence, fear, sexual content, profanity, drugs, alcohol, tobacco, gambling, and weapons supplied by the developer: none.
- Public user-generated content or user-to-user sharing: none.
- Chat, messaging, followers, matchmaking, contests, purchases, or real-money transactions: none.
- Internet access: yes, for account authentication and metadata sync.
- External links: users can open source URLs they saved themselves in the system browser.
- Users may privately import or type their own content; it is not published to other users.

Expected outcome: the lowest general rating tier, subject to IARC's final determination. Do not claim the app is designed for children; choose the intended audience consistently with the privacy policy.

## App Access and Review Notes

The app requires an account. Provide a dedicated, disposable reviewer account with confirmed email and representative sample data. Do not place credentials in this repository.

Review notes template:

> SnapShelf is a private, local-first inspiration organizer. Sign in with the reviewer credentials supplied in App access. The account is preloaded with sample metadata.
>
> Core navigation: Board shows spatial organization; The Tray contains unfiled items; Library provides search and filters; Settings contains Privacy Policy, Contact Support, password reset, local-media health, and account deletion.
>
> To test imports, use the Create action and choose an image with the Android system photo picker. To test sharing, share an image, URL, or text from another app to SnapShelf. The app does not request broad storage access.
>
> Images are copied to app-local storage and are not uploaded in this release. Titles, notes, labels, source URLs, organization metadata, account information, and a random installation identifier sync through Supabase.
>
> Account deletion: Settings > Security > Delete account. Type DELETE and enter the current password. This invokes the production deletion service and signs the user out.
>
> No special hardware, subscription, purchase, location, VPN, or region is required. Support contact: codecrafting.ltd@gmail.com.

Before submission, verify the reviewer account, links, password, import flow, deletion service, and any regional access from a clean Play-installed device.
