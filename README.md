# SoldOutAfrica Dashboard

Event organizer dashboard for managing events, ticket sales, and analytics.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📋 Current Features

### ✅ Login Page
- Beautiful, mobile-responsive authentication interface
- Sign in / Sign up toggle
- Email-based authentication flow
- Smooth animations and transitions
- Marketplace-inspired design with MontserratAlt1 font
- Dark mode support

See [LOGIN_PAGE.md](./LOGIN_PAGE.md) for detailed documentation.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 📁 Project Structure

```
web-dashboard/
├── app/                    # Next.js app directory
│   ├── fonts/             # MontserratAlt1 font files
│   ├── globals.css        # Global styles & theme
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page (login)
├── components/            # React components
│   ├── login-page.tsx    # Login/signup page
│   └── theme-provider.tsx # Theme context
├── lib/                   # Utilities
│   └── utils.ts          # Helper functions
└── public/                # Static assets
```

## 🎨 Design System

The dashboard uses the same design language as the SoldOutAfrica marketplace:

- **Typography**: MontserratAlt1 (100-700 weights)
- **Colors**: Black & white with grayscale palette
- **Theme**: Light/dark mode support
- **Spacing**: Consistent scale
- **Animations**: Smooth, purposeful

## 🔮 Upcoming Features

- [ ] Dashboard home with analytics overview
- [ ] Event management (create, edit, delete)
- [ ] Ticket type configuration
- [ ] Real-time sales tracking
- [ ] Attendee management
- [ ] Revenue analytics & reports
- [ ] Promotional tools
- [ ] Team/staff management
- [ ] Integration settings
- [ ] Notification center

## 📱 Responsive Design

Fully optimized for:
- 📱 Mobile devices (< 640px)
- 📱 Tablets (640px - 1024px)
- 💻 Desktop (> 1024px)

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## 🤝 Related Projects

- [SoldOutAfrica Marketplace](../soa-stack/marketplace) - Customer-facing event marketplace

## 📄 License

© 2026 SoldOutAfrica. All rights reserved.

