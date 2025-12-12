'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, Lock, Zap, Eye } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Confidential TWAMM</h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <span className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
              MEV-Protected Trading
            </span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold leading-tight">
            Trade Large Orders
            <br />
            <span className="gradient-text">Privately & Safely</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Execute TWAMM orders with Fully Homomorphic Encryption on Uniswap v4. 
            Protect your trading strategy from MEV attacks and front-running.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/orders-list"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Start Trading
            </Link>
            <a
              href="#features"
              className="px-8 py-4 border border-border rounded-lg font-semibold hover:bg-card transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Lock className="w-8 h-8" />}
            title="Fully Encrypted"
            description="All order parameters encrypted with FHE. Trade direction, amount, and duration remain confidential."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="MEV Protected"
            description="Prevent front-running and sandwich attacks. Your strategy stays hidden from MEV bots."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Automated Execution"
            description="Orders execute automatically in slices over time. No manual intervention needed."
          />
          <FeatureCard
            icon={<Eye className="w-8 h-8" />}
            title="Owner Visibility"
            description="Only you can decrypt your order details. Complete privacy with full control."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="space-y-8">
            <Step
              number={1}
              title="Submit Encrypted Order"
              description="Enter your trade parameters. They're encrypted client-side using FHE before submission."
            />
            <Step
              number={2}
              title="Automatic Execution"
              description="Your order executes in slices over time. All parameters remain encrypted on-chain."
            />
            <Step
              number={3}
              title="Withdraw Tokens"
              description="Once execution completes, withdraw your tokens. Simple and secure."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>Built with Uniswap v4 Hooks & Fhenix FHE</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass p-6 rounded-lg hover:border-primary/50 transition-all group">
      <div className="text-primary mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center font-bold text-primary">
        {number}
      </div>
      <div>
        <h4 className="text-xl font-semibold mb-2">{title}</h4>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

