# SoldOutAfrica Dashboard

A modern, elegant dashboard for event organizers to manage their events, track performance, and engage with their audience.

## 🔐 Security Features

This dashboard implements enterprise-grade security:
- **Progressive Rate Limiting**: Smart blocking that escalates with abuse (1min → 15min → 30min → 60min)
- **IP-based Protection**: Works across all tabs and browsers - cannot be bypassed
- **Production-Safe Authentication**: OTP codes never exposed in production
- **API Obfuscation**: Backend endpoints hidden behind Next.js proxy layer
- **Configurable Security**: Environment-based security controls
- **Automatic Recovery**: Violation counts reset after good behavior

📖 **[Read the full Security Documentation](./PROGRESSIVE_BLOCKING.md)**

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
copy .env.local.example .env.local
# Edit .env.local with your credentials

# Run development server
pnpm dev
```



## Overview

The SoldOutAfrica Dashboard provides event organizers with powerful tools to create, manage, and scale their events seamlessly. Built with modern web technologies, the platform offers an intuitive interface with smooth animations and responsive design across all devices.

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
