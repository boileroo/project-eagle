import math

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def linearize(c):
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

def rgb_to_oklch(r, g, b):
    # sRGB to Linear sRGB
    r_lin = linearize(r)
    g_lin = linearize(g)
    b_lin = linearize(b)
    
    # Linear sRGB to LMS
    # From https://bottosson.github.io/posts/oklab/
    # This actually is converting to XYZ first in the standard implementation, 
    # BUT standard Oklab implementation often combines steps or uses slightly different matrices.
    # The reference implementation:
    # float l = 0.4122214708f * c.r + 0.5363325363f * c.g + 0.0514459929f * c.b;
    # float m = 0.2119034982f * c.r + 0.6806995451f * c.g + 0.1073969566f * c.b;
    # float s = 0.0883024619f * c.r + 0.2817188376f * c.g + 0.6299787005f * c.b;
    #
    # Wait, the reference implementation labels these l, m, s but the matrix is clearly sRGB->XYZ (D65).
    # Then it does cbrtf(l). This implies Oklab uses XYZ as the LMS space? No.
    #
    # Let's look closer at the reference code.
    # Ah, the reference code provided by Ottosson:
    # 
    # Lab linear_srgb_to_oklab(RGB c) 
    # {
    #     float l = 0.4122214708f * c.r + 0.5363325363f * c.g + 0.0514459929f * c.b;
    #     float m = 0.2119034982f * c.r + 0.6806995451f * c.g + 0.1073969566f * c.b;
    #     float s = 0.0883024619f * c.r + 0.2817188376f * c.g + 0.6299787005f * c.b;
    #
    #     float l_ = cbrtf(l);
    #     float m_ = cbrtf(m);
    #     float s_ = cbrtf(s);
    #
    #     return {
    #         0.2104542553f*l_ + 0.7936177850f*m_ - 0.0040720468f*s_,
    #         1.9779984951f*l_ - 2.4285922050f*m_ + 0.4505937099f*s_,
    #         0.0259040371f*l_ + 0.7827717662f*m_ - 0.8086757660f*s_,
    #     };
    # }
    # 
    # Wait, 0.4122... IS the sRGB to XYZ matrix.
    # Does Oklab define LMS = XYZ? No.
    # 
    # Let me check another source.
    # "The Oklab color space" post says:
    # 1. Adapt linear sRGB to D65.
    # 2. Convert to LMS.
    # 3. Apply non-linearity.
    # 4. Convert to Lab.
    #
    # The matrix provided in the blog post for "M1" (XYZ to LMS) is:
    # 0.8189330101 0.3618667424 -0.1288597137
    # 0.0329845436 0.9293118715 0.0361456387
    # 0.0482003018 0.2643662691 0.6338517070
    #
    # So my previous code with the extra step was correct. The simplified code snippet I saw online might have been misleading or I misread it.
    # I will stick to the Explicit method: Linear sRGB -> XYZ -> LMS -> OKLab.
    
    # 1. Linear sRGB to XYZ (D65)
    x = 0.4124564 * r_lin + 0.3575761 * g_lin + 0.1804375 * b_lin
    y = 0.2126729 * r_lin + 0.7151522 * g_lin + 0.0721750 * b_lin
    z = 0.0193339 * r_lin + 0.1191920 * g_lin + 0.9503041 * b_lin
    
    # 2. XYZ to LMS (OKLab specific)
    l_val = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z
    m_val = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z
    s_val = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z
    
    # 3. Non-linearity (cube root)
    # Handle negative values for cube root (though unlikely for valid RGB)
    l_ = l_val**(1/3) if l_val >= 0 else -(-l_val)**(1/3)
    m_ = m_val**(1/3) if m_val >= 0 else -(-m_val)**(1/3)
    s_ = s_val**(1/3) if s_val >= 0 else -(-s_val)**(1/3)

    # 4. LMS to OKLab
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b_ok = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

    # 5. OKLab to OKLCH
    C = math.sqrt(a**2 + b_ok**2)
    h = math.degrees(math.atan2(b_ok, a))
    if h < 0:
        h += 360

    return L, C, h

colors = [
    "#FF8B2D", "#FAF1E6", "#DAEAF6", "#33383B", "#69D7A0",
    "#E66D69", "#F5C253", "#5B9BD5", "#C6C6C6"
]

print("Hex       -> OKLCH")
print("-" * 30)
for hex_c in colors:
    r, g, b = hex_to_rgb(hex_c)
    L, C, h = rgb_to_oklch(r, g, b)
    print(f"{hex_c} -> oklch({L:.4f} {C:.4f} {h:.2f})")
