# =====================================================================
#  Simulateur de marge — CGM   |   OCP Nutricrops
#  Application Shiny 
#  Pour toute information supplémentaire merci de contacter: fouad.ezzebdi@ocpgroup.ma
# =====================================================================

library(shiny)
library(bslib)
library(readxl)
library(dplyr)
library(plotly)
library(DT)
library(ggplot2)
library(gridExtra)
library(openxlsx)

source("R/calculs.R")

# ----------------------------------------------------------------------
# 1. Lecture des données
# ----------------------------------------------------------------------
csp       <- read_excel("data/CSP.xlsx", sheet = "CSP")
ref_prod  <- read_excel("data/Referentiel.xlsx", sheet = "Produit")
ref_rm    <- read_excel("data/Referentiel.xlsx", sheet = "RM")
params_df <- read_excel("data/Referentiel.xlsx", sheet = "Parameters")

PARAMS_DEFAULT <- list(
  CSP_ACS_S      = as.numeric(params_df[["CSP_ACS_S"]][1]),
  CSP_Roche_P2O5 = as.numeric(params_df[["CSP_Roche_P2O5"]][1]),
  CSP_ACS_P2O5   = as.numeric(params_df[["CSP_ACS_P2O5"]][1])
)

names(csp)[names(csp) == "EQ DAP Ratio"] <- "EQ_DAP_Ratio"

prod <- ref_prod
names(prod)[names(prod) == "Prix Initial"] <- "Prix_Initial"
prod <- left_join(
  prod,
  csp[, c("ID_Produit", "Soufre", "Ammoniac", "KCl", "ACS",
          "Roche_Granulation", "Zn", "B", "Cu", "AmSul", "P2O5", "EQ_DAP_Ratio")],
  by = "ID_Produit"
)
prod <- prod[order(prod[["Macro-Produit"]], prod$Produit), ]

rm_tbl <- ref_rm
names(rm_tbl)[names(rm_tbl) == "Prix Initial"] <- "Prix_Initial"

default_sel <- c("P003")

fmt <- function(x) {
  if (is.null(x) || length(x) == 0 || is.na(x)) return("—")
  format(round(x), big.mark = " ", scientific = FALSE)
}

# ----------------------------------------------------------------------
# 2. Thème & styles
# ----------------------------------------------------------------------
theme <- bs_theme(
  version = 5, bg = "#ffffff", fg = "#020202",
  primary = "#22ac14", secondary = "#e6e6e6", warning = "#f2c80f",
  base_font = font_google("Inter"), heading_font = font_google("Inter")
)

css <- "
body{background:#f3f4f1}
.container-fluid{max-width:1300px;padding-bottom:8px}

.appheader{display:flex;align-items:center;gap:18px;background:#fff;border:1px solid #e6e6e6;
  border-radius:14px;padding:14px 20px;margin:16px 0;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.appheader .ttl{font-size:21px;font-weight:700;color:#020202;line-height:1.1;letter-spacing:-.01em}
.appheader .sub{font-size:13px;color:#6b6b64;margin-top:3px}
.appheader .bar{margin-left:auto;width:40px;height:6px;background:#22ac14;border-radius:3px}

.kpis{display:flex;gap:14px;margin-bottom:18px;flex-wrap:wrap}
.kpi{flex:1;min-width:190px;background:#fff;border:1px solid #e6e6e6;border-radius:14px;
  padding:15px 18px;display:flex;gap:14px;align-items:center;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.kpi .ic{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;
  font-size:18px;flex:none}
.kpi .lab{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#97968f;font-weight:600}
.kpi .v{font-size:25px;font-weight:700;margin-top:3px;line-height:1;letter-spacing:-.01em}
.kpi .sub{font-size:12px;color:#6b6b64;margin-top:3px}

.card2{background:#fff;border:1px solid #e6e6e6;border-radius:14px;margin-bottom:16px;
  overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.card2-head{padding:13px 17px;border-bottom:1px solid #eef0ec;font-weight:600;font-size:14px;
  display:flex;align-items:center;gap:9px;color:#020202}
.card2-head .hic{font-size:15px;color:#22ac14}
.card2-head .meta{margin-left:auto;font-size:11px;color:#97968f;font-weight:400}
.card2-body{padding:12px 17px}
.card2-head .form-group,.card2-head .shiny-input-container{margin-bottom:0!important}
.card2-head .form-control,.card2-head .form-select,.card2-head .selectize-input{min-height:30px;padding:3px 9px;font-size:12px;border-radius:8px}

/* Recherche produits */
.searchwrap{position:relative;margin:2px 0 10px}
.searchwrap .fa{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#97968f;font-size:13px}
.searchbox{width:100%;font-size:13px;padding:9px 12px 9px 34px;border:1px solid #d8dad4;
  border-radius:10px;background:#fafbf9;transition:.15s}
.searchbox:focus{outline:none;border-color:#22ac14;box-shadow:0 0 0 3px rgba(34,172,20,.12);background:#fff}

/* Catégories pliables */
#prodPanel details{border:1px solid #eef0ec;border-radius:10px;margin-bottom:7px;overflow:hidden;background:#fff}
#prodPanel details[open]{border-color:#d9e8cf}
summary.grp{cursor:pointer;list-style:none;display:flex;align-items:center;gap:9px;
  font-size:12px;letter-spacing:.04em;font-weight:700;color:#157a55;background:#eef6e8;
  padding:9px 12px;user-select:none}
summary.grp::-webkit-details-marker{display:none}
summary.grp::before{content:'\\25B8';color:#6b9a4f;font-size:11px;transition:transform .15s}
details[open] > summary.grp::before{transform:rotate(90deg)}
summary.grp .mac{text-transform:uppercase}
summary.grp .cnt{margin-left:auto;color:#6b9a4f;font-weight:600;background:#fff;
  border-radius:20px;padding:1px 9px;font-size:11px}
.grpbody{padding:6px 12px 8px}

.prow{display:flex;align-items:center;gap:11px;padding:4px 2px;border-radius:8px;transition:background .12s}
.prow:hover{background:#f7f8f5}
.prow .nm{flex:1;font-size:13px;color:#020202;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.selbar{display:flex;gap:16px;padding:2px 2px 10px;font-size:12px}
.selbar a{color:#157a55;text-decoration:none;font-weight:500;cursor:pointer}
.selbar a:hover{text-decoration:underline}

.section-lab{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#9a7a08;
  font-weight:700;padding:14px 2px 4px;display:flex;align-items:center;gap:7px;border-top:1px dashed #e6e6e6;margin-top:10px}

.compact .form-group{margin-bottom:0!important}
.compact .checkbox{margin:0!important;min-height:0}
.compact .shiny-input-container{margin-bottom:0!important;width:auto!important}
.compact .form-control{height:33px;padding:3px 9px;text-align:right;font-size:13px;
  border:1px solid #d8dad4;border-radius:8px;transition:.15s}
.compact .form-control:focus{border-color:#22ac14;box-shadow:0 0 0 3px rgba(34,172,20,.12);outline:none}

.btn-rst{border-radius:10px!important;border:1px solid #d2d6cf!important;background:#fff!important;
  color:#4a4a45!important;font-weight:500!important;padding:9px 18px!important}
.btn-rst:hover{border-color:#22ac14!important;color:#157a55!important}
.dlbtn{background:#22ac14!important;color:#fff!important;border:none!important;border-radius:10px!important;
  font-weight:600!important;padding:9px 20px!important}
.dlbtn:hover{background:#1c9011!important}
.nav-tabs{background:#22ac14;border:none!important;border-radius:12px;padding:5px;gap:5px;
  display:flex;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.nav-tabs .nav-item .nav-link{color:#ffffff!important;border:none!important;border-radius:9px!important;
  padding:9px 20px!important;font-weight:600;background:transparent!important;margin:0;
  display:flex;align-items:center;gap:8px;transition:.15s}
.nav-tabs .nav-item .nav-link .fa,.nav-tabs .nav-item .nav-link svg{color:#ffffff}
.nav-tabs .nav-item .nav-link:hover{background:rgba(255,255,255,.16)!important;color:#fff!important}
.nav-tabs .nav-link.active{background:#ffffff!important;color:#157a55!important;
  box-shadow:0 1px 4px rgba(0,0,0,.16)}
.nav-tabs .nav-link.active .fa,.nav-tabs .nav-link.active svg{color:#157a55}
.nm .hint{font-size:11px;color:#157a55;font-style:italic;margin-left:8px;font-weight:400;cursor:help}
.nm .hint .fa{font-size:10px;margin-right:3px}
"

# Script de recherche : filtre les produits par nom et ouvre/masque les catégories
search_js <- "
function filterProd(q){
  q = (q || '').toLowerCase();
  var panel = document.getElementById('prodPanel');
  if(!panel) return;
  panel.querySelectorAll('details').forEach(function(d){
    var any = false;
    d.querySelectorAll('.prow').forEach(function(r){
      var t = r.querySelector('.nm');
      var m = !t || t.textContent.toLowerCase().indexOf(q) > -1;
      r.style.display = m ? '' : 'none';
      if(m) any = true;
    });
    if(q.length){ d.open = any; d.style.display = any ? '' : 'none'; }
    else { d.style.display = ''; d.open = (d.getAttribute('data-defopen') === '1'); }
  });
}
"

# --- Lignes prix matières premières ---
rm_rows <- lapply(seq_len(nrow(rm_tbl)), function(i) {
  id <- rm_tbl$ID_RM[i]
  div(class = "prow",
      div(class = "nm", rm_tbl$RM[i]),
      numericInput(paste0("rm_", id), NULL, value = rm_tbl$Prix_Initial[i], min = 0, width = "100px"))
})

# --- Section paramètres (éditables) ---
param_rows <- tagList(
  div(class = "section-lab", icon("sliders"), "Paramètres du modèle"),
  div(class = "prow", div(class = "nm", "CSP_ACS_S"),
      numericInput("p_acs_s", NULL, value = PARAMS_DEFAULT$CSP_ACS_S, step = 0.001, width = "100px")),
  div(class = "prow", div(class = "nm", "CSP_Roche_P2O5"),
      numericInput("p_roche", NULL, value = PARAMS_DEFAULT$CSP_Roche_P2O5, step = 0.1, width = "100px")),
  div(class = "prow", div(class = "nm", "CSP_ACS_P2O5"),
      numericInput("p_acs_p", NULL, value = PARAMS_DEFAULT$CSP_ACS_P2O5, step = 0.01, width = "100px"))
)

# --- Panneau produits : une catégorie pliable (details) par macro-produit ---
macros <- unique(prod[["Macro-Produit"]])
prod_panel <- lapply(seq_along(macros), function(gi) {
  m   <- macros[gi]
  sub <- prod[which(prod[["Macro-Produit"]] == m | (is.na(m) & is.na(prod[["Macro-Produit"]]))), ]
  rows <- lapply(seq_len(nrow(sub)), function(j) {
    id <- sub$ID_Produit[j]
    div(class = "prow",
        div(style = "flex:none", checkboxInput(paste0("sel_", id), NULL,
                                               value = id %in% default_sel, width = "20px")),
        div(class = "nm", sub$Produit[j]),
        numericInput(paste0("px_", id), NULL, value = sub$Prix_Initial[j], min = 0, width = "96px"))
  })
  summ <- tags$summary(class = "grp",
                       span(class = "mac", if (is.na(m)) "Autres" else m),
                       span(class = "cnt", nrow(sub)))
  if (gi == 1)
    tags$details(open = NA, `data-defopen` = "1", summ, div(class = "grpbody", rows))
  else
    tags$details(`data-defopen` = "0", summ, div(class = "grpbody", rows))
})

# ----------------------------------------------------------------------
# 3. UI
# ----------------------------------------------------------------------
# --- Variables et UI du volet sensibilité ---
shock_vars <- c("P2O5", rm_tbl$RM)
shock_rows <- lapply(shock_vars, function(var) {
  div(class = "prow",
      div(style = "flex:none", checkboxInput(paste0("sxon_", var), NULL,
                                             value = (var == "P2O5"), width = "20px")),
      div(class = "nm", var,
          if (var == "P2O5") span(class = "hint",
                                  title = "Le P2O5 fait varier le PRIX DE VENTE du produit, proportionnellement à sa teneur en P2O5. Les matières premières, elles, agissent sur le coût.",
                                  icon("circle-info"), "agit sur le prix de vente")),
      numericInput(paste0("sxval_", var), NULL, value = 0, width = "84px"),
      div(style = "flex:none", radioButtons(paste0("sxmode_", var), NULL,
                                            choices = c("%" = "pct", "$" = "abs"),
                                            selected = "pct", inline = TRUE)))
})

sens_ui <- tagList(
  div(style = "height:14px"),
  div(class = "card2",
      div(class = "card2-head", icon("wave-square", class = "hic"),
          span("Variables de sensibilité"),
          span(class = "meta", "cocher + choc (% ou $, valeurs négatives permises)")),
      div(class = "card2-body compact", shock_rows)),
  div(class = "card2",
      div(class = "card2-head", icon("table", class = "hic"),
          span("Impact combiné par produit"),
          span(class = "meta", "tous les chocs appliqués ensemble")),
      div(class = "card2-body", DTOutput("sens_combined"))),
  div(class = "card2",
      div(class = "card2-head", icon("chart-column", class = "hic"),
          span("Tornado — contribution par variable"),
          div(class = "meta", style = "display:flex;gap:10px;align-items:center",
              uiOutput("torn_prod_ui"),
              selectInput("torn_metric", NULL,
                          choices = c("CGM EQ DAP" = "Δ CGM EQ DAP", "CGM" = "Δ CGM", "Coût RM" = "Δ Coût RM"),
                          selected = "Δ CGM EQ DAP", width = "150px"))),
      div(class = "card2-body", plotlyOutput("tornado", height = "330px"))),
  div(class = "card2",
      div(class = "card2-head", icon("table-cells", class = "hic"),
          span("Impact séparé (par produit × variable)"),
          span(class = "meta", "contribution isolée de chaque choc")),
      div(class = "card2-body", DTOutput("sens_separate"))),
  div(style = "display:flex;gap:12px;margin:6px 0 36px;flex-wrap:wrap",
      downloadButton("dl_sens_xlsx", "Exporter Excel", class = "dlbtn"),
      downloadButton("dl_sens_csv", "Exporter CSV", class = "dlbtn"))
)

ui <- fluidPage(
  theme = theme,
  tags$head(tags$style(HTML(css)), tags$script(HTML(search_js))),
  
  div(class = "appheader",
      img(src = "logo.jpg", height = "46px"),
      div(div(class = "ttl", "Simulateur de marge — CGM"),
          div(class = "sub", "Coût de revient, CGM EQ DAP et composition du coût par produit")),
      div(class = "bar")),
  
  tabsetPanel(id = "tabs",
              tabPanel(tagList(icon("gauge"), " Simulation"),
                       
                       div(style = "height:14px"),
                       
                       # KPIs
                       div(class = "kpis",
                           div(class = "kpi",
                               div(class = "ic", style = "background:#eef6e8;color:#157a55", icon("trophy")),
                               div(div(class = "lab", "Meilleure CGM EQ DAP"),
                                   div(class = "v", style = "color:#22ac14", textOutput("kpi_best_v", inline = TRUE)),
                                   div(class = "sub", textOutput("kpi_best_n", inline = TRUE)))),
                           div(class = "kpi",
                               div(class = "ic", style = "background:#f7eede;color:#9a7a08", icon("arrow-trend-down")),
                               div(div(class = "lab", "Plus basse CGM EQ DAP"),
                                   div(class = "v", style = "color:#b9802a", textOutput("kpi_low_v", inline = TRUE)),
                                   div(class = "sub", textOutput("kpi_low_n", inline = TRUE)))),
                           div(class = "kpi",
                               div(class = "ic", style = "background:#eef0ec;color:#020202", icon("tag")),
                               div(div(class = "lab", "CGM du DAP"),
                                   div(class = "v", textOutput("kpi_dap_v", inline = TRUE)),
                                   div(class = "sub", "CGM brute (Prix − coût)")))),
                       
                       # Prix d'entrée
                       fluidRow(
                         column(5,
                                div(class = "card2",
                                    div(class = "card2-head", icon("flask", class = "hic"),
                                        span("Prix matières premières"), span(class = "meta", "$/t")),
                                    div(class = "card2-body compact", rm_rows, param_rows))),
                         column(7,
                                div(class = "card2",
                                    div(class = "card2-head", icon("box", class = "hic"),
                                        span("Produits à simuler"), span(class = "meta", "cocher + prix de vente $/t")),
                                    div(class = "card2-body compact",
                                        div(class = "searchwrap",
                                            icon("magnifying-glass"),
                                            tags$input(id = "searchProd", type = "text", class = "searchbox",
                                                       placeholder = "Rechercher un produit…", oninput = "filterProd(this.value)")),
                                        div(class = "selbar",
                                            actionLink("sel_all", tagList(icon("check-double"), "Tout sélectionner")),
                                            actionLink("sel_none", tagList(icon("xmark"), "Aucun"))),
                                        div(id = "prodPanel", prod_panel))))
                       ),
                       
                       # Graphes — empilés verticalement (l'un au-dessus de l'autre)
                       div(class = "card2",
                           div(class = "card2-head", icon("chart-column", class = "hic"),
                               span("CGM & CGM EQ DAP par produit"),
                               div(class = "meta",
                                   selectInput("sort1", NULL,
                                               choices = c("Trier : CGM EQ DAP ↓" = "eqdap", "Trier : CGM ↓" = "cgm", "Trier : Nom A–Z" = "nom"),
                                               selected = "eqdap", width = "200px"))),
                           div(class = "card2-body", plotlyOutput("g_eqdap", height = "420px"))),
                       
                       div(class = "card2",
                           div(class = "card2-head", icon("chart-simple", class = "hic"),
                               span("Composition du coût"),
                               div(class = "meta", style = "display:flex;gap:12px;align-items:center",
                                   selectInput("sort2", NULL,
                                               choices = c("Trier : Coût total ↓" = "cout", "Trier : CGM EQ DAP ↓" = "eqdap", "Trier : Nom A–Z" = "nom"),
                                               selected = "cout", width = "185px"),
                                   radioButtons("compo_mode", NULL,
                                                choices = c("$" = "abs", "%" = "pct"), selected = "abs", inline = TRUE))),
                           div(class = "card2-body", uiOutput("g_compo_ui"))),
                       
                       # Tableau de synthèse
                       div(class = "card2",
                           div(class = "card2-head", icon("table", class = "hic"),
                               span("Synthèse par produit"), span(class = "meta", "valeurs en $/t")),
                           div(class = "card2-body", DTOutput("tbl"))),
                       
                       # Actions
                       div(style = "display:flex;gap:12px;margin:4px 0 36px;flex-wrap:wrap",
                           actionButton("reset", "Réinitialiser", icon = icon("rotate-left"), class = "btn-rst"),
                           downloadButton("export", "PDF", class = "dlbtn"),
                           downloadButton("dl_xlsx", "Excel", class = "dlbtn"),
                           downloadButton("dl_csv", "CSV", class = "dlbtn"))
              ),
              
              tabPanel(tagList(icon("sliders"), " Analyse de sensibilité"), sens_ui)
  )
)

# ----------------------------------------------------------------------
# 4. Serveur
# ----------------------------------------------------------------------
server <- function(input, output, session) {
  
  v <- function(id, def) { x <- input[[id]]; if (is.null(x) || is.na(x)) def else x }
  
  params_r <- reactive(list(
    CSP_ACS_S      = v("p_acs_s", PARAMS_DEFAULT$CSP_ACS_S),
    CSP_Roche_P2O5 = v("p_roche", PARAMS_DEFAULT$CSP_Roche_P2O5),
    CSP_ACS_P2O5   = v("p_acs_p", PARAMS_DEFAULT$CSP_ACS_P2O5)
  ))
  
  prix_rm <- reactive({
    p <- sapply(seq_len(nrow(rm_tbl)), function(i)
      v(paste0("rm_", rm_tbl$ID_RM[i]), rm_tbl$Prix_Initial[i]))
    names(p) <- rm_tbl$RM; p
  })
  
  res_all <- reactive({
    pr <- prix_rm(); pa <- params_r()
    lapply(seq_len(nrow(prod)), function(i) {
      p <- prod[i, ]
      px <- v(paste0("px_", p$ID_Produit), p$Prix_Initial)
      csp_row <- list(
        P2O5 = p$P2O5, ACS = p$ACS, Ammoniac = p$Ammoniac, KCl = p$KCl,
        AmSul = p$AmSul, Roche_Granulation = p$Roche_Granulation,
        Zn = p$Zn, B = p$B, Cu = p$Cu, EQ_DAP_Ratio = p$EQ_DAP_Ratio, Prix = px)
      r <- calc_produit(csp_row, pr, pa)
      list(id = p$ID_Produit, nom = p$Produit, prix = px,
           cout = r$cout, cout_rm = r$cout_rm, cgm = r$cgm, cgm_eqdap = r$cgm_eqdap,
           sel = isTRUE(input[[paste0("sel_", p$ID_Produit)]]))
    })
  })
  
  res_sel <- reactive(Filter(function(x) isTRUE(x$sel), res_all()))
  
  # ---------- KPIs ----------
  output$kpi_best_v <- renderText({ s <- res_sel(); if (!length(s)) return("—")
  fmt(max(sapply(s, function(x) x$cgm_eqdap), na.rm = TRUE)) })
  output$kpi_best_n <- renderText({ s <- res_sel(); if (!length(s)) return("")
  vals <- sapply(s, function(x) x$cgm_eqdap); s[[which.max(vals)]]$nom })
  output$kpi_low_v <- renderText({ s <- res_sel(); if (!length(s)) return("—")
  fmt(min(sapply(s, function(x) x$cgm_eqdap), na.rm = TRUE)) })
  output$kpi_low_n <- renderText({ s <- res_sel(); if (!length(s)) return("")
  vals <- sapply(s, function(x) x$cgm_eqdap); s[[which.min(vals)]]$nom })
  output$kpi_dap_v <- renderText({ a <- res_all(); dap <- Filter(function(x) x$nom == "DAP", a)
  if (!length(dap)) return("—"); fmt(dap[[1]]$cgm) })
  
  # ---------- Données graphes ----------
  df_eqdap <- reactive({
    s <- res_sel(); if (!length(s)) return(NULL)
    data.frame(nom = sapply(s, function(x) x$nom),
               cgm = sapply(s, function(x) x$cgm),
               eqdap = sapply(s, function(x) x$cgm_eqdap),
               stringsAsFactors = FALSE)
  })
  df_compo <- reactive({
    s <- res_sel(); if (!length(s)) return(NULL)
    do.call(rbind, lapply(s, function(x) data.frame(
      nom = x$nom, composante = names(x$cout),
      cout = as.numeric(x$cout), cout_rm = x$cout_rm, stringsAsFactors = FALSE)))
  })
  
  # ---------- Graphe 1 : CGM + CGM EQ DAP (double barre) ----------
  output$g_eqdap <- renderPlotly({
    d <- df_eqdap()
    if (is.null(d)) return(plotly_empty(type = "scatter", mode = "markers") |>
                             layout(title = list(text = "Sélectionnez au moins un produit", font = list(size = 13))))
    key <- if (is.null(input$sort1)) "eqdap" else input$sort1
    d <- switch(key,
                nom = d[order(d$nom), ],
                cgm = d[order(-d$cgm), ],
                d[order(-d$eqdap), ])
    d$nom <- factor(d$nom, levels = d$nom)
    plot_ly(d, x = ~nom) |>
      add_bars(y = ~cgm, name = "CGM", marker = list(color = "#157a55"),
               text = ~round(cgm), texttemplate = "%{y:.0f}",
               textposition = "outside", textfont = list(size = 9), cliponaxis = FALSE,
               hovertemplate = "%{x}<br>CGM : %{y:.0f} $<extra></extra>") |>
      add_bars(y = ~eqdap, name = "CGM EQ DAP", marker = list(color = "#22ac14"),
               text = ~round(eqdap), texttemplate = "%{y:.0f}",
               textposition = "outside", textfont = list(size = 9), cliponaxis = FALSE,
               hovertemplate = "%{x}<br>CGM EQ DAP : %{y:.0f} $<extra></extra>") |>
      layout(barmode = "group",
             xaxis = list(title = "", tickangle = -35),
             yaxis = list(title = "$/t"),
             legend = list(orientation = "h", y = 1.12, x = 0),
             margin = list(b = 90, t = 30), font = list(family = "Inter")) |>
      config(displayModeBar = FALSE)
  })
  
  # ---------- Graphe 2 : composition du coût (hauteur adaptative) ----------
  output$g_compo_ui <- renderUI({
    n <- length(res_sel())
    h <- max(360, n * 46 + 120)
    plotlyOutput("g_compo", height = paste0(h, "px"))
  })
  
  output$g_compo <- renderPlotly({
    d <- df_compo()
    if (is.null(d)) return(plotly_empty(type = "scatter", mode = "markers") |>
                             layout(title = list(text = "Sélectionnez au moins un produit", font = list(size = 13))))
    pct   <- identical(input$compo_mode, "pct")
    s     <- res_sel()
    key2  <- if (is.null(input$sort2)) "cout" else input$sort2
    ord   <- switch(key2,
                    nom   = order(sapply(s, function(x) x$nom)),
                    eqdap = order(-sapply(s, function(x) x$cgm_eqdap)),
                    order(-sapply(s, function(x) x$cout_rm)))
    prods <- sapply(s, function(x) x$nom)[ord]
    p <- plot_ly()
    for (cmp in COMPOSANTES) {
      dd  <- d[d$composante == cmp, ]
      dd  <- dd[match(prods, dd$nom), ]
      val <- if (pct) dd$cout / dd$cout_rm * 100 else dd$cout
      lab <- ifelse(round(dd$cout) == 0, "", format(round(val), big.mark = " "))
      hov <- paste0(cmp, " : ", round(dd$cout), " $ (", round(dd$cout / dd$cout_rm * 100), " %)")
      p <- add_trace(p, x = val, y = prods, type = "bar", orientation = "h",
                     name = cmp, marker = list(color = unname(COMPO_COULEURS[[cmp]])),
                     text = lab, texttemplate = "%{text}", textposition = "inside",
                     insidetextanchor = "middle", textfont = list(size = 9),
                     cliponaxis = FALSE, hovertext = hov, hoverinfo = "text")
    }
    p |>
      layout(barmode = "stack",
             xaxis = list(title = if (pct) "Part du coût (%)" else "Coût ($/t)"),
             yaxis = list(title = "", categoryorder = "array", categoryarray = rev(prods)),
             legend = list(orientation = "h", y = 1.04, yanchor = "bottom", x = 0,
                           font = list(size = 10)),
             margin = list(t = 30, l = 10), font = list(family = "Inter")) |>
      config(displayModeBar = FALSE)
  })
  
  # ---------- Tableau de synthèse ----------
  df_synth <- reactive({
    s <- res_sel(); if (!length(s)) return(NULL)
    rows <- lapply(s, function(x) {
      base <- data.frame(Produit = x$nom, Prix = round(x$prix), CGM = round(x$cgm),
                         `CGM EQ DAP` = round(x$cgm_eqdap), `Coût RM` = round(x$cout_rm),
                         check.names = FALSE)
      cbind(base, as.data.frame(t(round(x$cout)), check.names = FALSE))
    })
    df <- do.call(rbind, rows)
    num <- sapply(df[-1], function(c) round(mean(c, na.rm = TRUE)))
    rbind(df, data.frame(Produit = "Moyenne", as.list(num), check.names = FALSE))
  })
  
  output$tbl <- renderDT({
    df <- df_synth()
    if (is.null(df)) return(datatable(
      data.frame(Information = "Sélectionnez au moins un produit"),
      rownames = FALSE, options = list(dom = "t")))
    datatable(df, rownames = FALSE, extensions = "Buttons",
              class = "row-border hover stripe",
              options = list(dom = "Bfrtip", scrollX = TRUE, paging = FALSE,
                             buttons = list("copy"),
                             columnDefs = list(list(className = "dt-right", targets = "_all")))) |>
      formatStyle("CGM",        color = styleInterval(0, c("#a32d2d", "#3b6d11")), fontWeight = "bold") |>
      formatStyle("CGM EQ DAP", color = styleInterval(0, c("#a32d2d", "#3b6d11")), fontWeight = "bold") |>
      formatStyle("Coût RM",    color = "#9a7a08") |>
      formatStyle("Produit", target = "row",
                  fontWeight = styleEqual("Moyenne", "bold"),
                  backgroundColor = styleEqual("Moyenne", "#fbfbf9"))
  })
  
  # ---------- Sélection rapide ----------
  observeEvent(input$sel_all,  { for (id in prod$ID_Produit) updateCheckboxInput(session, paste0("sel_", id), value = TRUE) })
  observeEvent(input$sel_none, { for (id in prod$ID_Produit) updateCheckboxInput(session, paste0("sel_", id), value = FALSE) })
  
  # ---------- Réinitialiser ----------
  observeEvent(input$reset, {
    for (i in seq_len(nrow(rm_tbl)))
      updateNumericInput(session, paste0("rm_", rm_tbl$ID_RM[i]), value = rm_tbl$Prix_Initial[i])
    for (i in seq_len(nrow(prod))) {
      updateNumericInput(session, paste0("px_", prod$ID_Produit[i]), value = prod$Prix_Initial[i])
      updateCheckboxInput(session, paste0("sel_", prod$ID_Produit[i]),
                          value = prod$ID_Produit[i] %in% default_sel)
    }
    updateNumericInput(session, "p_acs_s", value = PARAMS_DEFAULT$CSP_ACS_S)
    updateNumericInput(session, "p_roche", value = PARAMS_DEFAULT$CSP_Roche_P2O5)
    updateNumericInput(session, "p_acs_p", value = PARAMS_DEFAULT$CSP_ACS_P2O5)
    updateRadioButtons(session, "compo_mode", selected = "abs")
    updateSelectInput(session, "sort1", selected = "eqdap")
    updateSelectInput(session, "sort2", selected = "cout")
  })
  
  # ===================== ANALYSE DE SENSIBILITÉ =====================
  active_shocks <- reactive({
    out <- list()
    for (var in shock_vars) {
      if (isTRUE(input[[paste0("sxon_", var)]])) {
        out[[var]] <- list(val  = v(paste0("sxval_", var), 0),
                           mode = v(paste0("sxmode_", var), "pct"))
      }
    }
    out
  })
  
  # Recalcule les résultats des produits 'ids' en appliquant une liste de chocs
  apply_shocks <- function(ids, shocks) {
    base_rm <- prix_rm(); pa <- params_r()
    pr <- base_rm
    for (nm in names(shocks)) {
      if (nm == "P2O5") next
      sh <- shocks[[nm]]
      pr[nm] <- if (sh$mode == "pct") base_rm[nm] * (1 + sh$val / 100) else base_rm[nm] + sh$val
    }
    p2 <- shocks[["P2O5"]]
    lapply(ids, function(id) {
      p <- prod[prod$ID_Produit == id, ]
      prix <- v(paste0("px_", id), p$Prix_Initial)
      if (!is.null(p2)) {
        prix <- if (p2$mode == "pct") prix + p2$val / 100 * p$P2O5 * prix else prix + p2$val * p$P2O5
      }
      csp_row <- list(P2O5 = p$P2O5, ACS = p$ACS, Ammoniac = p$Ammoniac, KCl = p$KCl,
                      AmSul = p$AmSul, Roche_Granulation = p$Roche_Granulation,
                      Zn = p$Zn, B = p$B, Cu = p$Cu, EQ_DAP_Ratio = p$EQ_DAP_Ratio, Prix = prix)
      r <- calc_produit(csp_row, pr, pa)
      list(id = id, nom = p$Produit, prix = prix,
           cout_rm = r$cout_rm, cgm = r$cgm, cgm_eqdap = r$cgm_eqdap)
    })
  }
  
  # Cellule "valeur (Δ ; Δ%)" colorée
  cell_html <- function(valsim, base, better_up = TRUE) {
    d <- valsim - base
    pct <- if (base != 0) d / abs(base) * 100 else NA
    fav <- if (better_up) d >= 0 else d <= 0
    col <- if (round(d) == 0) "#97968f" else if (fav) "#3b6d11" else "#a32d2d"
    dpct <- if (is.na(pct)) "—" else paste0(ifelse(pct >= 0, "+", ""), round(pct), "%")
    paste0("<b>", format(round(valsim), big.mark = " "), "</b> ",
           "<span style='color:", col, ";font-size:11px'>(",
           ifelse(d >= 0, "+", ""), format(round(d), big.mark = " "), " ; ", dpct, ")</span>")
  }
  
  # Tableau impact combiné
  output$sens_combined <- renderDT({
    b <- res_sel()
    if (!length(b)) return(datatable(
      data.frame(Information = "Sélectionnez au moins un produit (onglet Simulation)"),
      rownames = FALSE, options = list(dom = "t")))
    s  <- apply_shocks(sapply(b, function(x) x$id), active_shocks())
    bb <- setNames(b, sapply(b, function(x) x$id))
    rows <- lapply(s, function(x) {
      ba <- bb[[x$id]]
      data.frame(Produit = x$nom,
                 Prix = cell_html(x$prix, ba$prix, TRUE),
                 `Coût RM` = cell_html(x$cout_rm, ba$cout_rm, FALSE),
                 CGM = cell_html(x$cgm, ba$cgm, TRUE),
                 `CGM EQ DAP` = cell_html(x$cgm_eqdap, ba$cgm_eqdap, TRUE),
                 check.names = FALSE, stringsAsFactors = FALSE)
    })
    datatable(do.call(rbind, rows), rownames = FALSE, escape = FALSE,
              class = "row-border hover stripe",
              options = list(dom = "frtip", paging = FALSE,
                             columnDefs = list(list(className = "dt-right", targets = "_all"),
                                               list(className = "dt-left", targets = 0))))
  })
  
  # Données impact séparé (par produit x variable)
  separate_data <- reactive({
    b <- res_sel(); sh <- active_shocks()
    if (!length(b) || !length(sh)) return(NULL)
    bb <- setNames(b, sapply(b, function(x) x$id)); ids <- names(bb)
    out <- list()
    for (var in names(sh)) {
      r  <- apply_shocks(ids, setNames(sh[var], var))
      rr <- setNames(r, sapply(r, function(x) x$id))
      for (id in ids) {
        ba <- bb[[id]]; x <- rr[[id]]
        out[[length(out) + 1]] <- data.frame(
          Produit = ba$nom, Variable = var,
          Choc = paste0(ifelse(sh[[var]]$val >= 0, "+", ""), sh[[var]]$val,
                        ifelse(sh[[var]]$mode == "pct", "%", "$")),
          `Δ Prix` = round(x$prix - ba$prix),
          `Δ Coût RM` = round(x$cout_rm - ba$cout_rm),
          `Δ CGM` = round(x$cgm - ba$cgm),
          `Δ CGM EQ DAP` = round(x$cgm_eqdap - ba$cgm_eqdap),
          check.names = FALSE, stringsAsFactors = FALSE)
      }
    }
    do.call(rbind, out)
  })
  
  output$sens_separate <- renderDT({
    d <- separate_data()
    if (is.null(d)) return(datatable(
      data.frame(Information = "Cochez au moins une variable de sensibilité"),
      rownames = FALSE, options = list(dom = "t")))
    datatable(d, rownames = FALSE, extensions = "Buttons",
              class = "row-border hover stripe",
              options = list(dom = "Bfrtip", scrollX = TRUE, pageLength = 15,
                             buttons = list("copy", list(extend = "csv", filename = "sensibilite", text = "CSV"),
                                            list(extend = "excel", filename = "sensibilite", text = "Excel")),
                             columnDefs = list(list(className = "dt-right", targets = 3:6)))) |>
      formatStyle("Δ Prix",       color = styleInterval(0, c("#a32d2d", "#3b6d11"))) |>
      formatStyle("Δ Coût RM",    color = styleInterval(0, c("#3b6d11", "#a32d2d"))) |>
      formatStyle("Δ CGM",        color = styleInterval(0, c("#a32d2d", "#3b6d11"))) |>
      formatStyle("Δ CGM EQ DAP", color = styleInterval(0, c("#a32d2d", "#3b6d11")))
  })
  
  # Tornado
  output$torn_prod_ui <- renderUI({
    noms <- sapply(res_sel(), function(x) x$nom)
    selectInput("torn_prod", NULL,
                choices = c("Moyenne (sélection)" = "__moy__", setNames(noms, noms)),
                selected = "__moy__", width = "200px")
  })
  
  output$tornado <- renderPlotly({
    d <- separate_data()
    if (is.null(d)) return(plotly_empty(type = "scatter", mode = "markers") |>
                             layout(title = list(text = "Cochez une variable de sensibilité", font = list(size = 13))))
    metric <- if (is.null(input$torn_metric)) "Δ CGM EQ DAP" else input$torn_metric
    psel   <- if (is.null(input$torn_prod)) "__moy__" else input$torn_prod
    if (psel == "__moy__") {
      agg <- aggregate(d[[metric]], list(Variable = d$Variable), mean)
      names(agg)[2] <- "val"
    } else {
      sub <- d[d$Produit == psel, ]
      agg <- data.frame(Variable = sub$Variable, val = sub[[metric]])
    }
    agg <- agg[order(abs(agg$val)), ]
    agg$Variable <- factor(agg$Variable, levels = agg$Variable)
    cols <- ifelse(agg$val >= 0, "#22ac14", "#a32d2d")
    plot_ly(agg, x = ~val, y = ~Variable, type = "bar", orientation = "h",
            marker = list(color = cols),
            text = ~round(val), texttemplate = "%{x:.0f}", textposition = "outside",
            cliponaxis = FALSE,
            hovertemplate = "%{y}<br>%{x:.0f}<extra></extra>") |>
      layout(xaxis = list(title = metric, zeroline = TRUE, zerolinecolor = "#cccccc"),
             yaxis = list(title = ""),
             margin = list(l = 10), font = list(family = "Inter")) |>
      config(displayModeBar = FALSE)
  })
  
  # ---------- Hypothèses (incluses dans les exports) ----------
  hyp_rm <- reactive({
    p <- prix_rm()
    data.frame(`Matière première` = rm_tbl$RM,
               `Prix ($/t)` = as.numeric(p[rm_tbl$RM]), check.names = FALSE)
  })
  hyp_params <- reactive({
    pa <- params_r()
    data.frame(Paramètre = c("CSP_ACS_S", "CSP_Roche_P2O5", "CSP_ACS_P2O5"),
               Valeur = c(pa$CSP_ACS_S, pa$CSP_Roche_P2O5, pa$CSP_ACS_P2O5),
               check.names = FALSE)
  })
  
  # ---------- Export synthèse (Excel / CSV avec hypothèses) ----------
  output$dl_xlsx <- downloadHandler(
    filename = function() paste0("simulation_CGM_", Sys.Date(), ".xlsx"),
    content = function(file) {
      sy <- df_synth(); if (is.null(sy)) sy <- data.frame(Information = "Aucun produit sélectionné")
      openxlsx::write.xlsx(list("Synthèse" = sy, "Hypothèses RM" = hyp_rm(),
                                "Paramètres" = hyp_params()), file)
    })
  output$dl_csv <- downloadHandler(
    filename = function() paste0("simulation_CGM_", Sys.Date(), ".csv"),
    content = function(file) {
      con <- file(file, open = "w", encoding = "UTF-8"); on.exit(close(con))
      sy <- df_synth(); if (is.null(sy)) sy <- data.frame(Information = "Aucun produit sélectionné")
      writeLines("Synthèse par produit", con); utils::write.csv2(sy, con, row.names = FALSE)
      writeLines("", con); writeLines("Hypothèses - Matières premières", con)
      utils::write.csv2(hyp_rm(), con, row.names = FALSE)
      writeLines("", con); writeLines("Paramètres", con)
      utils::write.csv2(hyp_params(), con, row.names = FALSE)
    })
  
  # ---------- Export analyse de sensibilité ----------
  sens_combined_num <- reactive({
    b <- res_sel(); if (!length(b)) return(NULL)
    s  <- apply_shocks(sapply(b, function(x) x$id), active_shocks())
    bb <- setNames(b, sapply(b, function(x) x$id))
    do.call(rbind, lapply(s, function(x) {
      ba <- bb[[x$id]]
      data.frame(Produit = x$nom,
                 Prix = round(x$prix), `Δ Prix` = round(x$prix - ba$prix),
                 `Coût RM` = round(x$cout_rm), `Δ Coût RM` = round(x$cout_rm - ba$cout_rm),
                 CGM = round(x$cgm), `Δ CGM` = round(x$cgm - ba$cgm),
                 `CGM EQ DAP` = round(x$cgm_eqdap), `Δ CGM EQ DAP` = round(x$cgm_eqdap - ba$cgm_eqdap),
                 check.names = FALSE)
    }))
  })
  shocks_df <- reactive({
    sh <- active_shocks()
    if (!length(sh)) return(data.frame(Information = "Aucun choc appliqué"))
    data.frame(Variable = names(sh),
               Choc = vapply(sh, function(z) paste0(ifelse(z$val >= 0, "+", ""), z$val,
                                                    ifelse(z$mode == "pct", "%", "$")), character(1)),
               check.names = FALSE, row.names = NULL)
  })
  output$dl_sens_xlsx <- downloadHandler(
    filename = function() paste0("sensibilite_CGM_", Sys.Date(), ".xlsx"),
    content = function(file) {
      comb <- sens_combined_num(); if (is.null(comb)) comb <- data.frame(Information = "Aucun produit")
      sep  <- separate_data();     if (is.null(sep))  sep  <- data.frame(Information = "Aucune variable")
      openxlsx::write.xlsx(list("Impact combiné" = comb, "Impact séparé" = sep,
                                "Chocs" = shocks_df(), "Hypothèses RM" = hyp_rm(),
                                "Paramètres" = hyp_params()), file)
    })
  output$dl_sens_csv <- downloadHandler(
    filename = function() paste0("sensibilite_CGM_", Sys.Date(), ".csv"),
    content = function(file) {
      con <- file(file, open = "w", encoding = "UTF-8"); on.exit(close(con))
      comb <- sens_combined_num(); if (is.null(comb)) comb <- data.frame(Information = "Aucun produit")
      sep  <- separate_data();     if (is.null(sep))  sep  <- data.frame(Information = "Aucune variable")
      writeLines("Impact combiné par produit", con); utils::write.csv2(comb, con, row.names = FALSE)
      writeLines("", con); writeLines("Impact séparé (produit x variable)", con)
      utils::write.csv2(sep, con, row.names = FALSE)
      writeLines("", con); writeLines("Chocs appliqués", con)
      utils::write.csv2(shocks_df(), con, row.names = FALSE)
      writeLines("", con); writeLines("Hypothèses - Matières premières", con)
      utils::write.csv2(hyp_rm(), con, row.names = FALSE)
      writeLines("", con); writeLines("Paramètres", con)
      utils::write.csv2(hyp_params(), con, row.names = FALSE)
    })
  
  # ---------- Export PDF ----------
  output$export <- downloadHandler(
    filename = function() paste0("simulation_CGM_", Sys.Date(), ".pdf"),
    content = function(file) {
      s <- res_sel()
      if (length(s) == 0) {
        pdf(file, width = 11, height = 8.5)
        grid::grid.text("Aucun produit sélectionné.", gp = grid::gpar(fontsize = 16)); dev.off()
        return(invisible())
      }
      d1 <- df_eqdap(); d1 <- d1[order(-d1$eqdap), ]
      d1l <- rbind(
        data.frame(nom = d1$nom, serie = "CGM", val = d1$cgm),
        data.frame(nom = d1$nom, serie = "CGM EQ DAP", val = d1$eqdap))
      d1l$nom <- factor(d1l$nom, levels = d1$nom)
      g1 <- ggplot(d1l, aes(nom, val, fill = serie)) +
        geom_col(position = "dodge") +
        geom_text(aes(label = round(val)), position = position_dodge(width = 0.9),
                  vjust = ifelse(d1l$val >= 0, -0.3, 1.2), size = 2.6) +
        scale_fill_manual(values = c("CGM" = "#157a55", "CGM EQ DAP" = "#22ac14")) +
        labs(title = "CGM & CGM EQ DAP par produit", x = NULL, y = "$/t", fill = NULL) +
        theme_minimal(base_size = 11) +
        theme(axis.text.x = element_text(angle = 40, hjust = 1),
              plot.title = element_text(face = "bold"), legend.position = "top")
      
      d2 <- df_compo(); d2$composante <- factor(d2$composante, levels = rev(COMPOSANTES))
      g2 <- ggplot(d2, aes(cout, nom, fill = composante)) + geom_col() +
        geom_text(aes(label = ifelse(round(cout) == 0, "", round(cout))),
                  position = position_stack(vjust = 0.5), size = 2.4, color = "#1a1a1a") +
        scale_fill_manual(values = COMPO_COULEURS) +
        labs(title = "Composition du coût ($)", x = "Coût ($/t)", y = NULL, fill = "Composante") +
        theme_minimal(base_size = 11) + theme(plot.title = element_text(face = "bold"))
      
      tab <- df_synth()
      th <- gridExtra::ttheme_minimal(base_size = 7,
                                      core = list(fg_params = list(hjust = 1, x = 0.92)),
                                      colhead = list(fg_params = list(fontface = "bold")))
      
      pdf(file, width = 11.7, height = 8.3)
      print(g1); print(g2)
      grid.arrange(top = "Synthèse par produit (valeurs en $/t)",
                   tableGrob(tab, rows = NULL, theme = th))
      dev.off()
    }
  )
}

shinyApp(ui, server)