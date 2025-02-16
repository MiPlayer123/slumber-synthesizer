
# Slumber Synthesizer - AI-Powered Dream Recording Platform

A modern web application for recording, analyzing, and sharing dreams with AI-enhanced features and community interaction.

Website: https://slumber-synthesizer.lovable.app/
Demo Video: https://youtu.be/E1teSDidmEI

## Features

### Dream Recording
- Record personal dreams with titles and descriptions
- Categorize dreams (nightmare, lucid, recurring, prophetic, normal)
- Add emotional context (joy, fear, confusion, anxiety, peace, etc.)
- AI-generated dream imagery
- AI-enhanced descriptions and interpretations

### Community Features
- Share dreams publicly
- Browse community dreams
- View AI-generated dream images
- Privacy controls for sharing

### Analytics
- Track dream patterns
- View emotional and category distributions
- Weekly dream frequency analysis
- Visual statistics and charts

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, Shadcn/UI, Framer Motion
- **State Management**: TanStack Query
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI Integration**: OpenAI (DALL-E 3), Mistral AI

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dream-journal
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Development

### Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts
├── hooks/         # Custom hooks
├── lib/           # Utility functions and types
├── pages/         # Page components
└── integrations/  # Third-party service integrations
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Supabase for backend services
- OpenAI for AI image generation
- Mistral AI for dream analysis
- Shadcn/UI for component library
- Framer Motion for animations

