// src/pages/BlogPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';

export const blogPosts = [
  {
    slug: 'imagine-a-world-without-invoices',
    title: 'Imagine a World Without Invoices',
    excerpt: 'Not better invoices. Not faster invoices. No invoices. A world where money moves as naturally as the service itself.',
    date: '2024-12-18',
    author: 'PayHive Team',
    readTime: '4 min read',
  },
  {
    slug: 'why-service-businesses-wait-30-days-to-get-paid',
    title: 'Why Service Businesses Wait 30 Days to Get Paid (And How to Fix It)',
    excerpt: 'Landscapers, cleaners, and contractors do the work today but wait weeks for payment. It doesn\'t have to be this way.',
    date: '2024-12-04',
    author: 'PayHive Team',
    readTime: '5 min read',
  },
  {
    slug: 'proof-of-service-the-missing-layer-in-field-service-management',
    title: 'Proof of Service: The Missing Layer in Field Service Management',
    excerpt: 'Photos, timestamps, and GPS aren\'t just for accountability. They\'re the foundation of automated payments.',
    date: '2024-11-20',
    author: 'PayHive Team',
    readTime: '4 min read',
  },
  {
    slug: 'the-end-of-chasing-payments',
    title: 'The End of Chasing Payments: What Customers Actually Want',
    excerpt: 'Surprise: your customers don\'t want to think about paying you either. Automatic payments aren\'t just good for you.',
    date: '2024-11-06',
    author: 'PayHive Team',
    readTime: '4 min read',
  },
  {
    slug: 'how-small-service-businesses-can-operate-like-enterprises',
    title: 'How Small Service Businesses Can Operate Like Enterprises',
    excerpt: 'Big companies have systems. Small companies have hustle. But what if small companies could have both?',
    date: '2024-10-23',
    author: 'PayHive Team',
    readTime: '5 min read',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="text-white py-20" style={{ backgroundColor: '#2e2e2e' }}>
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Thoughts on the future of payments, service businesses, and building technology that gets out of your way.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block border rounded-xl p-8 hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-2xl font-bold mb-3 group-hover:text-amber-600 transition-colors">
                {post.title}
              </h2>
              <p className="text-gray-600 mb-4">{post.excerpt}</p>
              <span className="inline-flex items-center gap-2 text-amber-600 font-medium">
                Read more
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} PayHive. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link to="/legal/terms" className="hover:text-gray-900">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-gray-900">Privacy</Link>
            <Link to="/security" className="hover:text-gray-900">Security</Link>
            <Link to="/" className="hover:text-gray-900">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
