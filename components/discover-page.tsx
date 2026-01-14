"use client"

import React from "react"
import { motion } from "framer-motion"
import { Compass, Sparkles, Calendar, Users, TrendingUp, BarChart3, Megaphone, CreditCard, Shield, Zap, Package, Rocket } from "lucide-react"

const products = [
  {
    icon: Calendar,
    title: "Event Management",
    description: "Create, manage, and track all your events from one powerful dashboard",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Users,
    title: "Audience Insights",
    description: "Deep analytics and insights about your attendees and their behavior",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: TrendingUp,
    title: "Growth Tools",
    description: "Powerful marketing and promotional tools to scale your events",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time reporting and revenue tracking with actionable insights",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Megaphone,
    title: "Marketing Suite",
    description: "Email campaigns, social media integration, and promotional codes",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: CreditCard,
    title: "Payment Solutions",
    description: "Secure payment processing with multiple payment methods",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: Shield,
    title: "Security & Compliance",
    description: "Enterprise-grade security and fraud prevention tools",
    color: "from-red-500 to-pink-500"
  },
  {
    icon: Zap,
    title: "Automation",
    description: "Automate repetitive tasks and streamline your workflow",
    color: "from-cyan-500 to-blue-500"
  },
  {
    icon: Package,
    title: "White Label",
    description: "Customize the platform with your brand and colors",
    color: "from-pink-500 to-rose-500"
  }
]

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-20 sm:pt-24 lg:pt-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8b5cf6]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] mb-6">
              <Compass className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] bg-clip-text text-transparent mb-6">
              Discover
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Your One-Stop Shop to Setup, Manage, and Scale Your Events
            </p>

            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
              <Sparkles className="w-5 h-5 text-[#8b5cf6]" />
              <span className="text-sm font-medium text-[#8b5cf6]">Coming Soon</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools and features designed to help event organizers create unforgettable experiences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => {
            const Icon = product.icon
            return (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"
                  style={{
                    backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                  }}
                />
                <div className="relative h-full bg-card border border-border rounded-2xl p-6 hover:border-[#8b5cf6]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#8b5cf6]/10 hover:-translate-y-1">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-2 group-hover:text-[#8b5cf6] transition-colors">
                    {product.title}
                  </h3>

                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] p-8 sm:p-12 text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Rocket className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Ready to Transform Your Events
            </h2>

            <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
              We&apos;re building something incredible. These powerful tools and features will revolutionize how you create, manage, and grow your events.
            </p>

            <div className="inline-flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-white text-[#8b5cf6] rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transform duration-200">
                Notify Me When Available
              </button>
              <button className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/30 transition-colors border border-white/20">
                Learn More
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Have questions? <a href="#" className="text-[#8b5cf6] hover:underline font-medium">Contact our team</a> to learn more about upcoming features.
        </p>
      </div>
    </div>
  )
}

