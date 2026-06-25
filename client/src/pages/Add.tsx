import AddCategoryForm from "@/components/AddCategoryForm";
import { Info, FolderPlus } from "lucide-react";

const DARK_IMAGE = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=1600&q=80";

export default function Add() {
  return (
    <div className="relative min-h-screen page-enter">
      {/* Blurred background */}
      <div className="fixed inset-0 -z-10">
        {/* Dark mode background — warm notebook desk */}
        <img src={DARK_IMAGE} alt="" className="hidden dark:block w-full h-full object-cover" />
        <div className="hidden dark:block absolute inset-0 backdrop-blur-xl bg-black/55" />
        {/* Light mode background — bright minimal workspace */}
        <img src={LIGHT_IMAGE} alt="" className="block dark:hidden w-full h-full object-cover" />
        <div className="block dark:hidden absolute inset-0 backdrop-blur-xl bg-white/65" />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Header */}
        <div className="mb-8 pt-2">
          <h1 className="text-4xl md:text-5xl font-bold font-playfair text-[var(--foreground)] drop-shadow-lg flex items-center gap-3">
            <FolderPlus className="w-8 h-8 md:w-10 md:h-10 text-blue-500/80" /> New Category
          </h1>
          <p className="text-[var(--glass-muted)] text-base mt-2">
            Create a beautiful space to organize your collections
          </p>
        </div>

        {/* Informative helper banner */}
        <div className="mb-6 p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-500/5 backdrop-blur-md border border-blue-500/20 dark:border-blue-500/10 text-[var(--foreground)] flex gap-3 items-start shadow-sm transition-all duration-300">
          <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-200">Tip: Adding items & subcategories</p>
            <p className="text-xs text-blue-850 dark:text-blue-300/80 leading-relaxed">
              To add subcategories or content, open the category page you created and add them directly. This automatically links them to the correct category!
            </p>
          </div>
        </div>

        {/* Direct Category Form */}
        <div className="mt-4">
          <AddCategoryForm />
        </div>
      </div>
    </div>
  );
}
