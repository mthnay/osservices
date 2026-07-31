import re

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Layout wrappers
    content = content.replace('max-w-[1600px] mx-auto space-y-8 pb-32 animate-fade-in px-4 md:px-8', 'space-y-6 animate-fade-in')
    content = content.replace('backdrop-blur-xl bg-white/40 p-6 rounded-[32px] border border-white/50 shadow-sm', 'gsx-card p-6 border-b border-[#d2d2d7]')
    
    # Cards
    content = content.replace('bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-white/60', 'gsx-card p-6')
    content = content.replace('bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white/60', 'gsx-card p-6')
    content = content.replace('bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/50 border border-white/60', 'gsx-card p-6')
    
    # Rounded adjustments
    content = content.replace('rounded-[32px]', 'rounded-lg')
    content = content.replace('rounded-[24px]', 'rounded-lg')
    content = content.replace('rounded-3xl', 'rounded-lg')
    content = content.replace('rounded-2xl', 'rounded-md')
    content = content.replace('rounded-xl', 'rounded-md')
    
    # Typography
    content = content.replace('font-black', 'font-semibold')
    content = content.replace('font-extrabold', 'font-semibold')
    content = content.replace('uppercase tracking-widest', 'text-xs uppercase tracking-wide')
    
    # Button fixes
    content = re.sub(r'bg-gray-900\s+text-white\s+px-8\s+py-4\s+rounded-md\s+font-semibold\s+hover:bg-black\s+transition-all\s+flex\s+items-center\s+justify-center\s+gap-2\s+shadow-xl\s+active:scale-95\s+w-full', 'gsx-button-primary w-full py-3 flex items-center justify-center gap-2', content)
    content = re.sub(r'bg-gray-900\s+hover:bg-black\s+text-white\s+px-6\s+py-3\s+rounded-md\s+font-semibold\s+transition-all\s+flex\s+items-center\s+gap-2\s+shadow-sm', 'gsx-button-primary px-4 py-2 flex items-center gap-2 text-sm', content)
    content = re.sub(r'bg-gray-900\s+hover:bg-black\s+text-white\s+px-8\s+py-4\s+rounded-md\s+font-semibold\s+flex\s+items-center\s+justify-center\s+gap-2\s+shadow-sm\s+transition-all\s+active:scale-95\s+w-full\s+md:w-auto', 'gsx-button-primary w-full md:w-auto px-6 py-3 flex items-center justify-center gap-2', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/ServiceAcceptance.jsx')
print("Refactored basic tokens in ServiceAcceptance.")
