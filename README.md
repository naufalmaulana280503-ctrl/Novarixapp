# Novarix Social Media Platform

Novarix is a heavy-class interactive social media platform built with React.js frontend, Node.js/Express backend, and PostgreSQL database.

## Branding & Identity

- **App Name**: Novarix Social Media
- **Logo**: Saturnus (Saturn) integrated across all pages
- **CEO**: N. Lucas Sterling

## Core Features

### Branding, Auth & Moderation
- Full-stack registration/login with **email or phone** + password
- **Terms & Conditions** enforcement: minimal age 18+, strict prohibition on online gambling promotion, strict prohibition on nude/pornographic content
- **Anti-bot system**: auto-detection and permanent ban on suspicious usernames or accounts with 0 posts
- "Founded by N. Lucas Sterling" credit on landing page

### Privacy & Content
- Post privacy settings: **Public**, **Close Friends**, **Private**
- **Video Reaction / Duet** with automatic watermark embedding
- **Repost & Download** with permanent watermark protection

### Comments & Gift Stickers
- Voice comments, image comments, stickers
- **Luxury Gift Stickers** with revenue sharing (e.g., $1,000 USD sticker: $100 admin fee, $100 tax, $800 to creator)

### Cinematic Camera & Editor
- Photo camera: front/back, screenshot, high-res zoom
- Video camera: 360p to **8K (7680×4320)**, **extreme slow motion up to 1000 fps**
- **Beauty Effects** (skin retouch/smoothing)
- Video editor: trim clips, speed control, transitions

### Chat, Groups & AI
- Private chat with voice messages, images, stickers, replies, pinned messages
- **AI Chat Assistant** inside the app
- **Group Chat** up to 35 million members with strict anti-pornography rules
- Group admin tools: info management, kick members, rename, pinned messages, voice chat, polling, exit/delete group

### Calls & Screen Sharing
- Voice Call, Video Call, Screen Recording / Share (presentation mode)

### Creator Premium & Monetization
- **Elite Creator Ads**: accounts with 70M+ followers and 35T+ likes can run home ads at **$1,000 USD per display**
- Ad stats dashboard and approval workflow

### Moderation & Reporting
- User reporting system with evidence upload
- Bot flagging and auto-ban moderation tools
- Moderator dashboard for reviewing reports

## Tech Stack

- **Frontend**: React.js, React Router, Axios, Vite
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Railway `DATABASE_URL` or another PostgreSQL provider)
- **Auth**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer

## Prerequisites

- Node.js (v18+)
- npm or yarn

## Setup Instructions

### 1. Navigate to the project

```bash
cd C:\laragon\www\Novarix
```

### 2. Backend Setup

```bash
cd backend
npm install
# Copy .env.example to .env and set DATABASE_URL and JWT_SECRET first.
npm run dev
```

The backend will run on `http://localhost:5000`

### Railway deployment (backend only)

Create a PostgreSQL service in Railway and link it to the backend service. Railway
will provide `DATABASE_URL` automatically. If your Railway setup exposes separate
PostgreSQL variables, the backend also accepts `PGHOST`, `PGPORT`, `PGDATABASE`,
`PGUSER`, and `PGPASSWORD` and assembles the connection URL automatically. Set
`JWT_SECRET`, `CORS_ORIGINS`, and the email variables in the backend service
variables, then deploy the `backend` directory with:

```bash
npm install
npm start
```

The backend runs on Railway's `PORT`, initializes the existing PostgreSQL schema on
startup, and serves REST plus Socket.IO from the same public URL. Set the Railway
service root directory to `backend` (or deploy that directory as the service source).
Required production variables are `DATABASE_URL` (the existing database),
`JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGINS` (the exact Vercel URL),
`APP_URL`/`BASE_URL` (the Vercel URL), and any configured email/Supabase variables.
Do not copy local `.env` files into Railway or commit secrets.

### Vercel deployment (frontend only)

Import the repository into Vercel and set the project root directory to `frontend`.
The included `frontend/vercel.json` builds `npm run build`, serves `dist`, and
rewrites client-side routes to `index.html`. Set the Vercel environment variable
`VITE_API_URL` to the public Railway backend URL, for example:

```env
VITE_API_URL=https://your-backend.up.railway.app
```

`VITE_API_URL` is embedded into the browser bundle, so it must never contain
database credentials, JWT secrets, or Supabase service-role keys. The PWA
`manifest.json` and `icon.jpg` remain in `frontend/public` and are copied into
the Vercel `dist` output.

For Gmail login, also set these **public** Vercel build variables (the Supabase
anon key is intended for browser use; never use the service-role key):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
VITE_ENABLED_OAUTH_PROVIDERS=google
```

In Supabase Dashboard, enable **Google** under Authentication > Providers and
configure its Google OAuth client ID and secret. In Google Cloud Console, add
Supabase's generated callback (`https://<project-ref>.supabase.co/auth/v1/callback`)
as an authorized redirect URI for that OAuth client. Under Supabase
Authentication > URL Configuration, add the deployed Vercel origin to **Site
URL** and add this exact application redirect to **Redirect URLs**:

```text
https://your-vercel-domain.example/dashboard
```

Use the equivalent `http://localhost:5173/dashboard` URL for local testing.
After changing Vercel variables, redeploy: Vite embeds `VITE_*` values at build
time. The backend must also retain `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` so it can validate the returned Supabase session
at `/api/auth/oauth`; these are backend-only variables.

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Configure Email (Required for registration links)

Update `backend/.env` with a real Gmail SMTP account. Gmail requires a 16-character App Password when 2-Step Verification is enabled; do not use the normal Gmail password:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
BASE_URL=http://localhost:3000
```

The address entered in the registration form is used as the recipient, so Gmail and Yahoo addresses are both supported. `EMAIL_USER` is the sender account; `EMAIL_PASS` must be its Gmail App Password. The backend returns an error instead of reporting success when SMTP is not configured or the message cannot be sent.

## Project Structure

```
Novarix/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── postsController.js
│   │   │   ├── commentsController.js
│   │   │   ├── reactionsController.js
│   │   │   ├── giftsController.js
│   │   │   ├── stickersController.js
│   │   │   ├── groupsController.js
│   │   │   ├── groupPollsController.js
│   │   │   ├── chatController.js
│   │   │   ├── callsController.js
│   │   │   ├── adsController.js
│   │   │   ├── moderationController.js
│   │   │   ├── watermarkController.js
│   │   │   ├── cameraController.js
│   │   │   ├── editorController.js
│   │   │   └── aiController.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   └── db.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── posts.js
│   │   │   ├── users.js
│   │   │   ├── comments.js
│   │   │   ├── reactions.js
│   │   │   ├── gifts.js
│   │   │   ├── stickers.js
│   │   │   ├── groups.js
│   │   │   ├── polls.js
│   │   │   ├── chat.js
│   │   │   ├── calls.js
│   │   │   ├── ads.js
│   │   │   ├── moderation.js
│   │   │   ├── watermarks.js
│   │   │   ├── camera.js
│   │   │   ├── editor.js
│   │   │   └── ai.js
│   │   ├── services/
│   │   │   └── email.js
│   │   └── server.js
│   ├── data/
│   ├── uploads/
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SaturnLogo.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── PostCard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ConfirmEmail.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Feed.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── PostDetail.jsx
│   │   │   ├── Comments.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── GroupChat.jsx
│   │   │   ├── AIChat.jsx
│   │   │   ├── Calls.jsx
│   │   │   ├── Camera.jsx
│   │   │   ├── Editor.jsx
│   │   │   ├── CreatorAds.jsx
│   │   │   └── Moderation.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── public/
│   │   └── saturn-logo.svg
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user (email/phone)
- `POST /api/auth/login` - Login with email or phone
- `GET /api/auth/confirm/:token` - Confirm email
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/phone-verification` - Send phone verification
- `POST /api/auth/verify-phone` - Verify phone code
- `POST /api/auth/accept-terms` - Accept terms & conditions

### Posts
- `POST /api/posts` - Create post (with privacy, metadata)
- `GET /api/posts/feed` - Get filtered feed
- `GET /api/posts/user/:userId` - Get user posts
- `DELETE /api/posts/:postId` - Delete post
- `POST /api/posts/:postId/view` - Increment view
- `POST /api/posts/:postId/share` - Share post
- `POST /api/posts/:postId/repost` - Repost with watermark

### Comments
- `GET /api/comments/post/:postId` - List comments
- `POST /api/comments/post/:postId` - Create comment (text/voice/image/sticker/gift)
- `POST /api/comments/post/:postId/:commentId/pin` - Pin comment
- `POST /api/comments/:commentId/like` - Like comment
- `DELETE /api/comments/:commentId` - Delete comment

### Reactions
- `POST /api/reactions/post/:postId` - Add reaction
- `DELETE /api/reactions/post/:postId` - Remove reaction
- `GET /api/reactions/post/:postId` - Get reactions
- `POST /api/reactions/post/:postId/duet-react` - Create duet/react video

### Gifts & Stickers
- `GET /api/gifts/list` - List gift stickers
- `POST /api/gifts/send` - Send gift
- `GET /api/gifts/transactions/:userId` - Gift history
- `GET /api/gifts/revenue/:userId` - Creator revenue
- `GET /api/stickers/list` - List stickers
- `GET /api/stickers/gifts` - List gift stickers
- `POST /api/stickers/acquire` - Acquire sticker
- `GET /api/stickers/user/:userId` - User stickers

### Groups & Polls
- `POST /api/groups` - Create group
- `GET /api/groups/:groupId` - Get group
- `PUT /api/groups/:groupId` - Update group
- `DELETE /api/groups/:groupId` - Delete group
- `GET /api/groups/user/:userId` - User groups
- `POST /api/groups/:groupId/join` - Join group
- `POST /api/groups/:groupId/leave` - Leave group
- `GET /api/groups/:groupId/members` - List members
- `DELETE /api/groups/:groupId/members/:userId` - Kick member
- `PUT /api/groups/:groupId/members/:userId/role` - Change role
- `POST /api/groups/:groupId/invite` - Generate invite code
- `POST /api/groups/invite/:inviteCode` - Join by invite
- `POST /api/polls/group/:groupId` - Create poll
- `POST /api/polls/poll/:pollId/vote` - Vote poll
- `GET /api/polls/poll/:pollId` - Poll results

### Chat
- `POST /api/chat/send` - Send message
- `GET /api/chat/private/:userId1/:userId2` - Private messages
- `GET /api/chat/group/:groupId` - Group messages
- `POST /api/chat/group/:groupId/pin/:messageId` - Pin message
- `POST /api/chat/group/:groupId/unpin/:messageId` - Unpin message
- `GET /api/chat/group/:groupId/pinned` - Pinned messages

### Calls
- `POST /api/calls/initiate` - Initiate call
- `PATCH /api/calls/:callId/status` - Update call status
- `POST /api/calls/:callId/end` - End call
- `GET /api/calls/history` - Call history

### Ads & Monetization
- `GET /api/ads/eligibility` - Check creator eligibility
- `POST /api/ads/create` - Create ad
- `GET /api/ads/my` - My ads
- `GET /api/ads/:adId/stats` - Ad stats
- `POST /api/ads/:adId/approve` - Approve ad
- `POST /api/ads/:adId/reject` - Reject ad

### Moderation
- `POST /api/moderation/report` - Report content
- `GET /api/moderation/reports` - Get reports
- `POST /api/moderation/reports/:reportId/review` - Review report
- `POST /api/moderation/bot-check/:userId` - Run bot check
- `POST /api/moderation/auto-ban-bots` - Auto ban flagged bots
- `GET /api/moderation/bot-flags` - Get bot flags

### Watermarks
- `POST /api/watermarks/post/:postId` - Apply watermark
- `GET /api/watermarks/post/:postId` - Get watermarks
- `POST /api/watermarks/batch` - Batch watermark

### Camera & Editor
- `POST /api/camera/photo` - Capture photo
- `POST /api/camera/video/start` - Start recording
- `POST /api/camera/video/stop/:sessionId` - Stop recording
- `POST /api/camera/beauty` - Apply beauty effect
- `POST /api/editor/:postId/trim` - Trim video
- `POST /api/editor/:postId/speed` - Change speed
- `POST /api/editor/:postId/transition` - Add transition

### AI
- `POST /api/ai/chat` - AI chat
- `POST /api/ai/suggest-caption` - Suggest caption
- `POST /api/ai/detect-nsfw` - NSFW detection

## Database

- **PostgreSQL** - configured with `DATABASE_URL`; the schema is initialized on backend startup
- No MySQL/PostgreSQL required
- 22 tables covering users, posts, comments, reactions, gifts, stickers, follows, groups, messages, calls, ads, reports, bot checks, terms, watermarks, sessions

## License

Proprietary - Novarix by N. Lucas Sterling
