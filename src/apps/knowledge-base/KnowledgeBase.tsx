import React, { useState } from 'react';
import { Search, Book, Plus, FolderPlus, FileText, ChevronRight, ChevronDown } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: string;
}

interface Category {
  name: string;
  articles: Article[];
}

const SAMPLE_DATA: Category[] = [
  {
    name: 'Getting Started',
    articles: [
      {
        id: '1',
        title: 'Introduction to IT Support',
        content: 'Learn the basics of IT support and common troubleshooting steps...',
        category: 'Getting Started',
        tags: ['basics', 'introduction'],
        lastUpdated: '2025-03-31'
      },
      {
        id: '2',
        title: 'Password Reset Procedures',
        content: 'Step-by-step guide for handling password reset requests...',
        category: 'Getting Started',
        tags: ['passwords', 'security'],
        lastUpdated: '2025-03-30'
      }
    ]
  },
  {
    name: 'Hardware',
    articles: [
      {
        id: '3',
        title: 'Printer Troubleshooting',
        content: 'Common printer issues and their solutions...',
        category: 'Hardware',
        tags: ['printers', 'troubleshooting'],
        lastUpdated: '2025-03-29'
      }
    ]
  },
  {
    name: 'Software',
    articles: [
      {
        id: '4',
        title: 'Email Client Setup',
        content: 'Guide for setting up various email clients...',
        category: 'Software',
        tags: ['email', 'configuration'],
        lastUpdated: '2025-03-28'
      }
    ]
  }
];

export function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Getting Started']);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
          <p className="mt-2 text-gray-400">
            Central repository for IT support documentation and guides
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          <Plus className="h-4 w-4" />
          <span>New Article</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Categories */}
          <div className="bg-[#151B2B] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">Categories</h2>
              <button className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors text-gray-400 hover:text-white">
                <FolderPlus className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {SAMPLE_DATA.map(category => (
                <div key={category.name}>
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full flex items-center justify-between p-2 hover:bg-[#1C2333] rounded-lg transition-colors text-gray-300 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4" />
                      <span>{category.name}</span>
                    </div>
                    {expandedCategories.includes(category.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedCategories.includes(category.name) && (
                    <div className="ml-4 mt-2 space-y-1">
                      {category.articles.map(article => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                            selectedArticle?.id === article.id
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-400 hover:bg-[#1C2333] hover:text-white'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{article.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {selectedArticle ? (
            <div className="bg-[#151B2B] rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">{selectedArticle.title}</h2>
              <div className="flex items-center gap-4 mb-6">
                <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm">
                  {selectedArticle.category}
                </span>
                <span className="text-sm text-gray-400">
                  Last updated: {selectedArticle.lastUpdated}
                </span>
              </div>
              <div className="prose prose-invert">
                <p className="text-gray-300">{selectedArticle.content}</p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
                <div className="flex gap-2">
                  {selectedArticle.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-[#1C2333] text-gray-300 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#151B2B] rounded-lg p-6 text-center">
              <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">
                Select an article to view
              </h2>
              <p className="text-gray-400">
                Choose an article from the sidebar or use the search to find specific content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}