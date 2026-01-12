import { ComponentType } from 'react'
import * as flags from 'country-flag-icons/react/3x2'

export interface CountryData {
  name: string
  prefix: string
  flag: ComponentType<{ className?: string }>
}

export class CountriesHelper {
  private static countries: Record<string, CountryData> = {
    ad: { name: 'Andorra', prefix: '+376', flag: flags.AD },
    ae: { name: 'United Arab Emirates', prefix: '+971', flag: flags.AE },
    af: { name: 'Afghanistan', prefix: '+93', flag: flags.AF },
    ag: { name: 'Antigua and Barbuda', prefix: '+1-268', flag: flags.AG },
    ai: { name: 'Anguilla', prefix: '+1-264', flag: flags.AI },
    al: { name: 'Albania', prefix: '+355', flag: flags.AL },
    am: { name: 'Armenia', prefix: '+374', flag: flags.AM },
    ao: { name: 'Angola', prefix: '+244', flag: flags.AO },
    aq: { name: 'Antarctica', prefix: '+672', flag: flags.AQ },
    ar: { name: 'Argentina', prefix: '+54', flag: flags.AR },
    as: { name: 'American Samoa', prefix: '+1-684', flag: flags.AS },
    at: { name: 'Austria', prefix: '+43', flag: flags.AT },
    au: { name: 'Australia', prefix: '+61', flag: flags.AU },
    aw: { name: 'Aruba', prefix: '+297', flag: flags.AW },
    ax: { name: 'Åland Islands', prefix: '+358-18', flag: flags.AX },
    az: { name: 'Azerbaijan', prefix: '+994', flag: flags.AZ },
    ba: { name: 'Bosnia and Herzegovina', prefix: '+387', flag: flags.BA },
    bb: { name: 'Barbados', prefix: '+1-246', flag: flags.BB },
    bd: { name: 'Bangladesh', prefix: '+880', flag: flags.BD },
    be: { name: 'Belgium', prefix: '+32', flag: flags.BE },
    bf: { name: 'Burkina Faso', prefix: '+226', flag: flags.BF },
    bg: { name: 'Bulgaria', prefix: '+359', flag: flags.BG },
    bh: { name: 'Bahrain', prefix: '+973', flag: flags.BH },
    bi: { name: 'Burundi', prefix: '+257', flag: flags.BI },
    bj: { name: 'Benin', prefix: '+229', flag: flags.BJ },
    bl: { name: 'Saint Barthélemy', prefix: '+590', flag: flags.BL },
    bm: { name: 'Bermuda', prefix: '+1-441', flag: flags.BM },
    bn: { name: 'Brunei', prefix: '+673', flag: flags.BN },
    bo: { name: 'Bolivia', prefix: '+591', flag: flags.BO },
    bq: { name: 'Caribbean Netherlands', prefix: '+599', flag: flags.BQ },
    br: { name: 'Brazil', prefix: '+55', flag: flags.BR },
    bs: { name: 'Bahamas', prefix: '+1-242', flag: flags.BS },
    bt: { name: 'Bhutan', prefix: '+975', flag: flags.BT },
    bw: { name: 'Botswana', prefix: '+267', flag: flags.BW },
    by: { name: 'Belarus', prefix: '+375', flag: flags.BY },
    bz: { name: 'Belize', prefix: '+501', flag: flags.BZ },
    ca: { name: 'Canada', prefix: '+1', flag: flags.CA },
    cc: { name: 'Cocos Islands', prefix: '+61', flag: flags.CC },
    cd: { name: 'Congo (DRC)', prefix: '+243', flag: flags.CD },
    cf: { name: 'Central African Republic', prefix: '+236', flag: flags.CF },
    cg: { name: 'Congo (Republic)', prefix: '+242', flag: flags.CG },
    ch: { name: 'Switzerland', prefix: '+41', flag: flags.CH },
    ci: { name: 'Côte d\'Ivoire', prefix: '+225', flag: flags.CI },
    ck: { name: 'Cook Islands', prefix: '+682', flag: flags.CK },
    cl: { name: 'Chile', prefix: '+56', flag: flags.CL },
    cm: { name: 'Cameroon', prefix: '+237', flag: flags.CM },
    cn: { name: 'China', prefix: '+86', flag: flags.CN },
    co: { name: 'Colombia', prefix: '+57', flag: flags.CO },
    cr: { name: 'Costa Rica', prefix: '+506', flag: flags.CR },
    cu: { name: 'Cuba', prefix: '+53', flag: flags.CU },
    cv: { name: 'Cape Verde', prefix: '+238', flag: flags.CV },
    cw: { name: 'Curaçao', prefix: '+599', flag: flags.CW },
    cx: { name: 'Christmas Island', prefix: '+61', flag: flags.CX },
    cy: { name: 'Cyprus', prefix: '+357', flag: flags.CY },
    cz: { name: 'Czech Republic', prefix: '+420', flag: flags.CZ },
    de: { name: 'Germany', prefix: '+49', flag: flags.DE },
    dj: { name: 'Djibouti', prefix: '+253', flag: flags.DJ },
    dk: { name: 'Denmark', prefix: '+45', flag: flags.DK },
    dm: { name: 'Dominica', prefix: '+1-767', flag: flags.DM },
    do: { name: 'Dominican Republic', prefix: '+1-809', flag: flags.DO },
    dz: { name: 'Algeria', prefix: '+213', flag: flags.DZ },
    ec: { name: 'Ecuador', prefix: '+593', flag: flags.EC },
    ee: { name: 'Estonia', prefix: '+372', flag: flags.EE },
    eg: { name: 'Egypt', prefix: '+20', flag: flags.EG },
    eh: { name: 'Western Sahara', prefix: '+212', flag: flags.EH },
    er: { name: 'Eritrea', prefix: '+291', flag: flags.ER },
    es: { name: 'Spain', prefix: '+34', flag: flags.ES },
    et: { name: 'Ethiopia', prefix: '+251', flag: flags.ET },
    fi: { name: 'Finland', prefix: '+358', flag: flags.FI },
    fj: { name: 'Fiji', prefix: '+679', flag: flags.FJ },
    fk: { name: 'Falkland Islands', prefix: '+500', flag: flags.FK },
    fm: { name: 'Micronesia', prefix: '+691', flag: flags.FM },
    fo: { name: 'Faroe Islands', prefix: '+298', flag: flags.FO },
    fr: { name: 'France', prefix: '+33', flag: flags.FR },
    ga: { name: 'Gabon', prefix: '+241', flag: flags.GA },
    gb: { name: 'United Kingdom', prefix: '+44', flag: flags.GB },
    gd: { name: 'Grenada', prefix: '+1-473', flag: flags.GD },
    ge: { name: 'Georgia', prefix: '+995', flag: flags.GE },
    gf: { name: 'French Guiana', prefix: '+594', flag: flags.GF },
    gg: { name: 'Guernsey', prefix: '+44', flag: flags.GG },
    gh: { name: 'Ghana', prefix: '+233', flag: flags.GH },
    gi: { name: 'Gibraltar', prefix: '+350', flag: flags.GI },
    gl: { name: 'Greenland', prefix: '+299', flag: flags.GL },
    gm: { name: 'Gambia', prefix: '+220', flag: flags.GM },
    gn: { name: 'Guinea', prefix: '+224', flag: flags.GN },
    gp: { name: 'Guadeloupe', prefix: '+590', flag: flags.GP },
    gq: { name: 'Equatorial Guinea', prefix: '+240', flag: flags.GQ },
    gr: { name: 'Greece', prefix: '+30', flag: flags.GR },
    gt: { name: 'Guatemala', prefix: '+502', flag: flags.GT },
    gu: { name: 'Guam', prefix: '+1-671', flag: flags.GU },
    gw: { name: 'Guinea-Bissau', prefix: '+245', flag: flags.GW },
    gy: { name: 'Guyana', prefix: '+592', flag: flags.GY },
    hk: { name: 'Hong Kong', prefix: '+852', flag: flags.HK },
    hn: { name: 'Honduras', prefix: '+504', flag: flags.HN },
    hr: { name: 'Croatia', prefix: '+385', flag: flags.HR },
    ht: { name: 'Haiti', prefix: '+509', flag: flags.HT },
    hu: { name: 'Hungary', prefix: '+36', flag: flags.HU },
    id: { name: 'Indonesia', prefix: '+62', flag: flags.ID },
    ie: { name: 'Ireland', prefix: '+353', flag: flags.IE },
    il: { name: 'Israel', prefix: '+972', flag: flags.IL },
    im: { name: 'Isle of Man', prefix: '+44', flag: flags.IM },
    in: { name: 'India', prefix: '+91', flag: flags.IN },
    io: { name: 'British Indian Ocean Territory', prefix: '+246', flag: flags.IO },
    iq: { name: 'Iraq', prefix: '+964', flag: flags.IQ },
    ir: { name: 'Iran', prefix: '+98', flag: flags.IR },
    is: { name: 'Iceland', prefix: '+354', flag: flags.IS },
    it: { name: 'Italy', prefix: '+39', flag: flags.IT },
    je: { name: 'Jersey', prefix: '+44', flag: flags.JE },
    jm: { name: 'Jamaica', prefix: '+1-876', flag: flags.JM },
    jo: { name: 'Jordan', prefix: '+962', flag: flags.JO },
    jp: { name: 'Japan', prefix: '+81', flag: flags.JP },
    ke: { name: 'Kenya', prefix: '+254', flag: flags.KE },
    kg: { name: 'Kyrgyzstan', prefix: '+996', flag: flags.KG },
    kh: { name: 'Cambodia', prefix: '+855', flag: flags.KH },
    ki: { name: 'Kiribati', prefix: '+686', flag: flags.KI },
    km: { name: 'Comoros', prefix: '+269', flag: flags.KM },
    kn: { name: 'Saint Kitts and Nevis', prefix: '+1-869', flag: flags.KN },
    kp: { name: 'North Korea', prefix: '+850', flag: flags.KP },
    kr: { name: 'South Korea', prefix: '+82', flag: flags.KR },
    kw: { name: 'Kuwait', prefix: '+965', flag: flags.KW },
    ky: { name: 'Cayman Islands', prefix: '+1-345', flag: flags.KY },
    kz: { name: 'Kazakhstan', prefix: '+7', flag: flags.KZ },
    la: { name: 'Laos', prefix: '+856', flag: flags.LA },
    lb: { name: 'Lebanon', prefix: '+961', flag: flags.LB },
    lc: { name: 'Saint Lucia', prefix: '+1-758', flag: flags.LC },
    li: { name: 'Liechtenstein', prefix: '+423', flag: flags.LI },
    lk: { name: 'Sri Lanka', prefix: '+94', flag: flags.LK },
    lr: { name: 'Liberia', prefix: '+231', flag: flags.LR },
    ls: { name: 'Lesotho', prefix: '+266', flag: flags.LS },
    lt: { name: 'Lithuania', prefix: '+370', flag: flags.LT },
    lu: { name: 'Luxembourg', prefix: '+352', flag: flags.LU },
    lv: { name: 'Latvia', prefix: '+371', flag: flags.LV },
    ly: { name: 'Libya', prefix: '+218', flag: flags.LY },
    ma: { name: 'Morocco', prefix: '+212', flag: flags.MA },
    mc: { name: 'Monaco', prefix: '+377', flag: flags.MC },
    md: { name: 'Moldova', prefix: '+373', flag: flags.MD },
    me: { name: 'Montenegro', prefix: '+382', flag: flags.ME },
    mf: { name: 'Saint Martin', prefix: '+590', flag: flags.MF },
    mg: { name: 'Madagascar', prefix: '+261', flag: flags.MG },
    mh: { name: 'Marshall Islands', prefix: '+692', flag: flags.MH },
    mk: { name: 'North Macedonia', prefix: '+389', flag: flags.MK },
    ml: { name: 'Mali', prefix: '+223', flag: flags.ML },
    mm: { name: 'Myanmar', prefix: '+95', flag: flags.MM },
    mn: { name: 'Mongolia', prefix: '+976', flag: flags.MN },
    mo: { name: 'Macau', prefix: '+853', flag: flags.MO },
    mp: { name: 'Northern Mariana Islands', prefix: '+1-670', flag: flags.MP },
    mq: { name: 'Martinique', prefix: '+596', flag: flags.MQ },
    mr: { name: 'Mauritania', prefix: '+222', flag: flags.MR },
    ms: { name: 'Montserrat', prefix: '+1-664', flag: flags.MS },
    mt: { name: 'Malta', prefix: '+356', flag: flags.MT },
    mu: { name: 'Mauritius', prefix: '+230', flag: flags.MU },
    mv: { name: 'Maldives', prefix: '+960', flag: flags.MV },
    mw: { name: 'Malawi', prefix: '+265', flag: flags.MW },
    mx: { name: 'Mexico', prefix: '+52', flag: flags.MX },
    my: { name: 'Malaysia', prefix: '+60', flag: flags.MY },
    mz: { name: 'Mozambique', prefix: '+258', flag: flags.MZ },
    na: { name: 'Namibia', prefix: '+264', flag: flags.NA },
    nc: { name: 'New Caledonia', prefix: '+687', flag: flags.NC },
    ne: { name: 'Niger', prefix: '+227', flag: flags.NE },
    nf: { name: 'Norfolk Island', prefix: '+672', flag: flags.NF },
    ng: { name: 'Nigeria', prefix: '+234', flag: flags.NG },
    ni: { name: 'Nicaragua', prefix: '+505', flag: flags.NI },
    nl: { name: 'Netherlands', prefix: '+31', flag: flags.NL },
    no: { name: 'Norway', prefix: '+47', flag: flags.NO },
    np: { name: 'Nepal', prefix: '+977', flag: flags.NP },
    nr: { name: 'Nauru', prefix: '+674', flag: flags.NR },
    nu: { name: 'Niue', prefix: '+683', flag: flags.NU },
    nz: { name: 'New Zealand', prefix: '+64', flag: flags.NZ },
    om: { name: 'Oman', prefix: '+968', flag: flags.OM },
    pa: { name: 'Panama', prefix: '+507', flag: flags.PA },
    pe: { name: 'Peru', prefix: '+51', flag: flags.PE },
    pf: { name: 'French Polynesia', prefix: '+689', flag: flags.PF },
    pg: { name: 'Papua New Guinea', prefix: '+675', flag: flags.PG },
    ph: { name: 'Philippines', prefix: '+63', flag: flags.PH },
    pk: { name: 'Pakistan', prefix: '+92', flag: flags.PK },
    pl: { name: 'Poland', prefix: '+48', flag: flags.PL },
    pm: { name: 'Saint Pierre and Miquelon', prefix: '+508', flag: flags.PM },
    pr: { name: 'Puerto Rico', prefix: '+1-787', flag: flags.PR },
    ps: { name: 'Palestine', prefix: '+970', flag: flags.PS },
    pt: { name: 'Portugal', prefix: '+351', flag: flags.PT },
    pw: { name: 'Palau', prefix: '+680', flag: flags.PW },
    py: { name: 'Paraguay', prefix: '+595', flag: flags.PY },
    qa: { name: 'Qatar', prefix: '+974', flag: flags.QA },
    re: { name: 'Réunion', prefix: '+262', flag: flags.RE },
    ro: { name: 'Romania', prefix: '+40', flag: flags.RO },
    rs: { name: 'Serbia', prefix: '+381', flag: flags.RS },
    ru: { name: 'Russia', prefix: '+7', flag: flags.RU },
    rw: { name: 'Rwanda', prefix: '+250', flag: flags.RW },
    sa: { name: 'Saudi Arabia', prefix: '+966', flag: flags.SA },
    sb: { name: 'Solomon Islands', prefix: '+677', flag: flags.SB },
    sc: { name: 'Seychelles', prefix: '+248', flag: flags.SC },
    sd: { name: 'Sudan', prefix: '+249', flag: flags.SD },
    se: { name: 'Sweden', prefix: '+46', flag: flags.SE },
    sg: { name: 'Singapore', prefix: '+65', flag: flags.SG },
    sh: { name: 'Saint Helena', prefix: '+290', flag: flags.SH },
    si: { name: 'Slovenia', prefix: '+386', flag: flags.SI },
    sk: { name: 'Slovakia', prefix: '+421', flag: flags.SK },
    sl: { name: 'Sierra Leone', prefix: '+232', flag: flags.SL },
    sm: { name: 'San Marino', prefix: '+378', flag: flags.SM },
    sn: { name: 'Senegal', prefix: '+221', flag: flags.SN },
    so: { name: 'Somalia', prefix: '+252', flag: flags.SO },
    sr: { name: 'Suriname', prefix: '+597', flag: flags.SR },
    ss: { name: 'South Sudan', prefix: '+211', flag: flags.SS },
    st: { name: 'São Tomé and Príncipe', prefix: '+239', flag: flags.ST },
    sv: { name: 'El Salvador', prefix: '+503', flag: flags.SV },
    sx: { name: 'Sint Maarten', prefix: '+1-721', flag: flags.SX },
    sy: { name: 'Syria', prefix: '+963', flag: flags.SY },
    sz: { name: 'Eswatini', prefix: '+268', flag: flags.SZ },
    tc: { name: 'Turks and Caicos Islands', prefix: '+1-649', flag: flags.TC },
    td: { name: 'Chad', prefix: '+235', flag: flags.TD },
    tg: { name: 'Togo', prefix: '+228', flag: flags.TG },
    th: { name: 'Thailand', prefix: '+66', flag: flags.TH },
    tj: { name: 'Tajikistan', prefix: '+992', flag: flags.TJ },
    tk: { name: 'Tokelau', prefix: '+690', flag: flags.TK },
    tl: { name: 'Timor-Leste', prefix: '+670', flag: flags.TL },
    tm: { name: 'Turkmenistan', prefix: '+993', flag: flags.TM },
    tn: { name: 'Tunisia', prefix: '+216', flag: flags.TN },
    to: { name: 'Tonga', prefix: '+676', flag: flags.TO },
    tr: { name: 'Turkey', prefix: '+90', flag: flags.TR },
    tt: { name: 'Trinidad and Tobago', prefix: '+1-868', flag: flags.TT },
    tv: { name: 'Tuvalu', prefix: '+688', flag: flags.TV },
    tw: { name: 'Taiwan', prefix: '+886', flag: flags.TW },
    tz: { name: 'Tanzania', prefix: '+255', flag: flags.TZ },
    ua: { name: 'Ukraine', prefix: '+380', flag: flags.UA },
    ug: { name: 'Uganda', prefix: '+256', flag: flags.UG },
    us: { name: 'United States', prefix: '+1', flag: flags.US },
    uy: { name: 'Uruguay', prefix: '+598', flag: flags.UY },
    uz: { name: 'Uzbekistan', prefix: '+998', flag: flags.UZ },
    va: { name: 'Vatican City', prefix: '+379', flag: flags.VA },
    vc: { name: 'Saint Vincent and the Grenadines', prefix: '+1-784', flag: flags.VC },
    ve: { name: 'Venezuela', prefix: '+58', flag: flags.VE },
    vg: { name: 'British Virgin Islands', prefix: '+1-284', flag: flags.VG },
    vi: { name: 'U.S. Virgin Islands', prefix: '+1-340', flag: flags.VI },
    vn: { name: 'Vietnam', prefix: '+84', flag: flags.VN },
    vu: { name: 'Vanuatu', prefix: '+678', flag: flags.VU },
    wf: { name: 'Wallis and Futuna', prefix: '+681', flag: flags.WF },
    ws: { name: 'Samoa', prefix: '+685', flag: flags.WS },
    xk: { name: 'Kosovo', prefix: '+383', flag: flags.XK },
    ye: { name: 'Yemen', prefix: '+967', flag: flags.YE },
    yt: { name: 'Mayotte', prefix: '+262', flag: flags.YT },
    za: { name: 'South Africa', prefix: '+27', flag: flags.ZA },
    zm: { name: 'Zambia', prefix: '+260', flag: flags.ZM },
    zw: { name: 'Zimbabwe', prefix: '+263', flag: flags.ZW },
  }

  // Получить данные страны по коду
  static getCountryByCode(code: string): CountryData | undefined {
    return this.countries[code.toLowerCase()]
  }

  // Получить код страны по названию
  static getCodeByName(name: string): string | undefined {
    const entry = Object.entries(this.countries).find(
      ([, data]) => data.name.toLowerCase() === name.toLowerCase()
    )
    return entry?.[0]
  }

  // Получить все страны как массив для рендеринга
  static getAllCountries(): Array<{ code: string; data: CountryData }> {
    return Object.entries(this.countries).map(([code, data]) => ({
      code,
      data,
    }))
  }

  // Получить префикс по коду страны
  static getPrefixByCode(code: string): string | undefined {
    return this.countries[code.toLowerCase()]?.prefix
  }

  // Получить название по коду страны
  static getNameByCode(code: string): string | undefined {
    return this.countries[code.toLowerCase()]?.name
  }

  // Получить флаг по коду страны
  static getFlagByCode(code: string): ComponentType<{ className?: string }> | undefined {
    return this.countries[code.toLowerCase()]?.flag
  }

  // Проверить существует ли страна с таким кодом
  static isValidCode(code: string): boolean {
    return code.toLowerCase() in this.countries
  }

  // Получить код страны по префиксу телефона
  static getCodeByPrefix(prefix: string): string | undefined {
    const normalizedPrefix = prefix.startsWith('+') ? prefix : `+${prefix}`
    const entry = Object.entries(this.countries).find(
      ([, data]) => data.prefix === normalizedPrefix
    )
    return entry?.[0]
  }
}
