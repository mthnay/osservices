import os
import glob

def refactor_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Layout wrappers
        content = content.replace('max-w-[1600px] mx-auto space-y-8 pb-32 animate-fade-in px-4 md:px-8', 'space-y-6 animate-fade-in')
        content = content.replace('backdrop-blur-xl bg-white/40 p-6 rounded-[32px] border border-white/50 shadow-sm', 'gsx-card p-6 border-b border-[#d2d2d7]')
        
        # Cards
        content = content.replace('bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-white/60', 'gsx-card p-6')
        content = content.replace('bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white/60', 'gsx-card p-6')
        content = content.replace('bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/50 border border-white/60', 'gsx-card p-6')
        
        # Modal specific
        content = content.replace('modal-content w-full max-w-lg p-8', 'modal-content w-full max-w-lg p-6')
        content = content.replace('modal-content w-full max-w-2xl p-8', 'modal-content w-full max-w-2xl p-6')
        content = content.replace('modal-content w-full max-w-4xl p-8', 'modal-content w-full max-w-4xl p-6')
        content = content.replace('modal-content w-full max-w-5xl p-8', 'modal-content w-full max-w-5xl p-6')
        
        # Rounded adjustments
        content = content.replace('rounded-[32px]', 'rounded-lg')
        content = content.replace('rounded-[24px]', 'rounded-lg')
        content = content.replace('rounded-[40px]', 'rounded-lg')
        content = content.replace('rounded-3xl', 'rounded-lg')
        content = content.replace('rounded-2xl', 'rounded-md')
        content = content.replace('rounded-xl', 'rounded-md')
        
        # Typography
        content = content.replace('font-black', 'font-semibold')
        content = content.replace('font-extrabold', 'font-semibold')
        content = content.replace('uppercase tracking-widest', 'text-xs uppercase tracking-wide')

        with open(filepath, 'w') as f:
            f.write(content)
        print("Refactored " + filepath)
    except FileNotFoundError:
        print("File not found: " + filepath)

# Refactor all modals and other components
components = glob.glob('/Users/mthnay/Projeler/mobile-asp/src/components/*.jsx')
for c in components:
    refactor_file(c)

