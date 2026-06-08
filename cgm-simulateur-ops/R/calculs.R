# =====================================================================
#  Logique de calcul du CGM — Simulateur de marge OCP Nutricrops
#  Toutes les formules métier sont isolées ici.
#  Pour toute information supplémentaire merci de contacter: fouad.ezzebdi@ocpgroup.ma
# =====================================================================

# Calcule, pour UN produit, le coût de chaque matière première,
# le coût total, le CGM (= Prix - coût) et le CGM EQ DAP (= CGM / ratio).
#
#  csp    : liste nommée des ratios du produit + Prix + EQ_DAP_Ratio
#           (P2O5, ACS, Ammoniac, KCl, AmSul, Roche_Granulation, Zn, B, Cu, EQ_DAP_Ratio, Prix)
#  prix   : vecteur nommé des prix des matières premières
#           (noms = ceux de la feuille RM : Soufre, Ammoniac, KCL, Amsul,
#            Roche_P2O5, Roche_Granulation, Zn, B, Cu)
#  params : liste des paramètres (CSP_ACS_S, CSP_Roche_P2O5, CSP_ACS_P2O5)

calc_produit <- function(csp, prix, params) {
  
  g <- function(x) if (is.null(x) || length(x) == 0 || is.na(x)) 0 else as.numeric(x)
  
  cout <- c(
    # Coût Soufre = CSP_ACS_S * (P2O5 * CSP_ACS_P2O5 + ACS) * Prix_Soufre
    "Soufre" =
      (params$CSP_ACS_S * (g(csp[["P2O5"]]) * params$CSP_ACS_P2O5 + g(csp[["ACS"]]))+g(csp[["Soufre"]])) *
      g(prix[["Soufre"]]),
    
    # Coût Roche P2O5 = P2O5 * CSP_Roche_P2O5 * Prix_Roche_P2O5
    "Roche P2O5" =
      g(csp[["P2O5"]]) * params$CSP_Roche_P2O5 * g(prix[["Roche_P2O5"]]),
    
    # Matières premières standard = ratio (CSP) * prix (référentiel)
    "Ammoniac"          = g(csp[["Ammoniac"]])          * g(prix[["Ammoniac"]]),
    "KCl"               = g(csp[["KCl"]])               * g(prix[["KCL"]]),
    "AmSul"             = g(csp[["AmSul"]])             * g(prix[["Amsul"]]),
    "Roche Granulation" = g(csp[["Roche_Granulation"]]) * g(prix[["Roche_Granulation"]]),
    "Zn"                = g(csp[["Zn"]])                * g(prix[["Zn"]]),
    "B"                 = g(csp[["B"]])                 * g(prix[["B"]]),
    "Cu"                = g(csp[["Cu"]])                * g(prix[["Cu"]])
  )
  
  cout_rm <- sum(cout)
  cgm     <- g(csp[["Prix"]]) - cout_rm
  
  ratio   <- g(csp[["EQ_DAP_Ratio"]])
  cgm_eqdap <- if (ratio == 0) NA_real_ else cgm / ratio
  
  list(
    cout      = cout,        # coût par matière première
    cout_rm   = cout_rm,     # coût total des matières premières
    cgm       = cgm,         # CGM = Prix - coût total
    cgm_eqdap = cgm_eqdap    # CGM EQ DAP = CGM / EQ DAP Ratio
  )
}

# Ordre d'affichage et couleurs des composantes de coût (graphes)
COMPOSANTES <- c("Soufre", "Roche P2O5", "Ammoniac", "KCl", "AmSul",
                 "Roche Granulation", "Zn", "B", "Cu")

COMPO_COULEURS <- c(
  "Soufre"            = "#f2c80f",
  "Roche P2O5"        = "#b9802a",
  "Ammoniac"          = "#22ac14",
  "KCl"               = "#157a55",
  "AmSul"             = "#7ac143",
  "Roche Granulation" = "#d9a441",
  "Zn"                = "#6b6b64",
  "B"                 = "#a8a8a0",
  "Cu"                = "#cfcfca"
)
