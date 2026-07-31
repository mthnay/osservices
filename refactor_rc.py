import re

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
        
        # Table & list cards
        content = content.replace('bg-white rounded-3xl p-4 shadow-xl border border-gray-100', 'gsx-card p-4 hover:bg-gray-50')
        content = content.replace('bg-white rounded-3xl p-6 border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group', 'gsx-card p-6 flex flex-col justify-between hover:border-apple-blue')
        
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
        
        # Button fixes
        content = re.sub(r'bg-gray-900\s+text-white\s+px-6\s+py-3\s+rounded-md\s+font-semibold\s+shadow-sm\s+hover:bg-black\s+transition-all\s+flex\s+items-center\s+justify-center\s+gap-2', 'gsx-button-primary px-4 py-2 flex items-center justify-center gap-2', content)

        with open(filepath, 'w') as f:
            f.write(content)
        print("Refactored " + filepath)
    except FileNotFoundError:
        print("File not found: " + filepath)

refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/RepairCenter.jsx')
refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/ReadyForPickup.jsx')
refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/Archive.jsx')
refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/ApprovalPending.jsx')

