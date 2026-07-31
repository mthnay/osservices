import re

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Common replacements for flat GSX design
    # Remove max-w and excessive paddings from main containers
    content = content.replace('max-w-[1600px] mx-auto space-y-8 pb-32 animate-fade-in px-4 md:px-8', 'space-y-6 animate-fade-in')
    content = content.replace('max-w-[1600px] mx-auto space-y-6 pb-32 animate-fade-in px-4 md:px-8', 'space-y-6 animate-fade-in')
    
    # Remove backdrop-blur and glassmorphism from headers
    content = re.sub(r'backdrop-blur-xl bg-white/40 p-6 rounded-\[32px\] border border-white/50 shadow-sm', 'gsx-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6', content)
    
    # Fonts
    content = content.replace('font-black', 'font-semibold')
    content = content.replace('font-extrabold', 'font-semibold')
    
    # Cards and rounding
    content = content.replace('rounded-[32px]', 'rounded-lg')
    content = content.replace('rounded-[40px]', 'rounded-lg')
    content = content.replace('rounded-[48px]', 'rounded-lg')
    content = content.replace('rounded-3xl', 'rounded-lg')
    content = content.replace('rounded-2xl', 'rounded-md')
    content = content.replace('rounded-xl', 'rounded-md')
    
    # Shadows
    content = content.replace('shadow-xl', 'shadow-sm')
    content = content.replace('shadow-2xl', 'shadow-sm')
    content = content.replace('shadow-lg', 'shadow-sm')
    content = content.replace('shadow-[0_32px_120px_-20px_rgba(0,0,0,0.08)]', 'shadow-sm')
    
    # Primary Buttons
    content = re.sub(r'bg-gray-900\s+hover:bg-black\s+text-white\s+px-6\s+py-3\s+rounded-md\s+font-semibold\s+flex\s+items-center\s+gap-2\s+shadow-sm', 'gsx-button-primary flex items-center gap-2 px-4 py-2', content)
    content = re.sub(r'bg-gray-900\s+text-white\s+px-4\s+py-3\s+rounded-md\s+text-sm\s+font-semibold\s+shadow-sm\s+hover:shadow-sm\s+hover:bg-black\s+transition-all', 'gsx-button-primary px-4 py-2 text-sm', content)
    
    with open(filepath, 'w') as f:
        f.write(content)

refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/PendingRepairs.jsx')
refactor_file('/Users/mthnay/Projeler/mobile-asp/src/components/Customers.jsx')
print("Refactored basic tokens in PendingRepairs and Customers.")
