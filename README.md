# Slumber Synthesizer - AI-Powered Dream Recording Platform

A modern web application for recording, analyzing, and sharing dreams with AI-enhanced features and community interaction.

Website: <https://lucidrem.com/>

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
- **AI Integration**: Google Gemini, OpenAI, Mistral AI

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
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8080` or at the port specified by the `PORT` environment variable.

## Development

### Project Structure

```text
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

## Environment Variables and Security

### Managing Sensitive API Keys

This project uses environment variables to securely manage sensitive information such as API keys and tokens. Here's how to properly set up and manage your environment variables:

1. Copy the `.env.example` file to a new file named `.env`:

   ```bash
   cp .env.example .env
   ```

2. Fill in your actual API keys and credentials in the `.env` file. This file should **never** be committed to the repository.

3. Run the environment sync script to ensure all parts of the application have access to the required variables:
   ```bash
   ./scripts/sync_env.sh
   ```

### Security Best Practices

- **Never commit your `.env` file** to version control
- **Never hardcode sensitive information** in your source code
- Use session storage instead of localStorage for temporary client-side storage of sensitive data
- When deploying, set environment variables through your hosting platform's secure environment configuration
- Regularly rotate API keys and secrets

If you're developing new features that require additional environment variables:

1. Add them to your `.env` file
2. Add them to `.env.example` with placeholder values
3. Update the `sync_env.sh` script if they need to be available to Supabase Edge Functions

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
- Google Gemini for AI image generation
- OpenAI for text generation
- Mistral AI for dream analysis
- Shadcn/UI for component library
- Framer Motion for animations
