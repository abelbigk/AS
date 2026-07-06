# Create AS app icon as PNG

# Create a simple AS icon image (1024x1024 for app store)
# Using ImageMagick if available, otherwise use Python

$iconPath = "assets/images/icon.png"
$foregroundPath = "assets/images/android-icon-foreground.png"
$backgroundPath = "assets/images/android-icon-background.png"
$monochromeImagePath = "assets/images/android-icon-monochrome.png"

Write-Host "Creating AS app icon..." -ForegroundColor Green

# Try using Python to create the icon
$pythonCode = @"
from PIL import Image, ImageDraw, ImageFont
import os

# Create directories if they don't exist
os.makedirs('assets/images', exist_ok=True)

# Icon dimensions
size = 1024
bg_color = (98, 0, 238)  # Material Purple
text_color = (255, 255, 255)  # White

# Create main icon
img = Image.new('RGBA', (size, size), bg_color + (255,))
draw = ImageDraw.Draw(img)

# Try to use a nice font, fall back to default
try:
    # Use a large font
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 500)
except:
    font = ImageFont.load_default()

# Draw "AS" text centered
text = "AS"
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
x = (size - text_width) // 2
y = (size - text_height) // 2 - 50
draw.text((x, y), text, fill=text_color, font=font)

# Save main icon
img.save('assets/images/icon.png')
print("✓ Main icon created: assets/images/icon.png")

# Create foreground (just the "AS" text on transparent)
fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw_fg = ImageDraw.Draw(fg)
draw_fg.text((x, y), text, fill=text_color, font=font)
fg.save('assets/images/android-icon-foreground.png')
print("✓ Foreground created: assets/images/android-icon-foreground.png")

# Create background (solid purple)
bg = Image.new('RGBA', (size, size), bg_color + (255,))
bg.save('assets/images/android-icon-background.png')
print("✓ Background created: assets/images/android-icon-background.png")

# Create monochrome version (white)
mono = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw_mono = ImageDraw.Draw(mono)
draw_mono.text((x, y), text, fill=(255, 255, 255, 255), font=font)
mono.save('assets/images/android-icon-monochrome.png')
print("✓ Monochrome created: assets/images/android-icon-monochrome.png")

print("\n✅ All icons created successfully!")
"@

# Save and run Python script
$pythonScript = "create_icon.py"
$pythonCode | Out-File $pythonScript -Encoding UTF8

# Try to run with python
python $pythonScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "Python not available or failed. Using alternative method..." -ForegroundColor Yellow
}
