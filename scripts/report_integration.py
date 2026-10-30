"""Integrate the optimizer into the preserved PDF entrypoint on every rebuild."""
def integrate(source):
    def replace(old,new):
        nonlocal source
        assert old in source,'PDF integration source changed: '+old[:90]
        source=source.replace(old,new,1)
    replace("const ready=!!lastSimulationResult;b.disabled=!ready;b.title=ready?'Export the completed simulation report as PDF':'Run the simulation first';", "const optimizerReady=!!window.getOptimizerReport?.(),ready=!!lastSimulationResult||optimizerReady;b.disabled=!ready;b.title=optimizerReady?'Export the retirement recommendation and any completed detailed simulation as one PDF':ready?'Export the detailed simulation. Run Find my retirement plan to include its recommendation.':'Run Find my retirement plan or Run Simulation first';")
    replace('function invalidateResults(){window.invalidateOptimizer?.();','function invalidateResults({preserveOptimizer=false}={}){clearFullReportDownload();if(!preserveOptimizer)window.invalidateOptimizer?.();')
    replace("const i=readInputs(),errs=validate(i);if(errs.length){alert(errs.join('\\n'));return}invalidateResults();", "const i=readInputs(),errs=validate(i);if(errs.length){alert(errs.join('\\n'));return}invalidateResults({preserveOptimizer:true});")
    replace("try{if(!lastSimulationResult)throw new Error('Run the simulation before exporting the full report.');", "try{const optimizerResult=window.getOptimizerReport?.();if(!lastSimulationResult&&!optimizerResult)throw new Error('Run Find my retirement plan or Run Simulation before exporting the full report.');")
    replace('const pages=[reportSummaryPage(lastSimulationResult)];', "const pages=optimizerResult?RetirementReport.optimizerPages(optimizerResult,{newPage:newPdfPage,title:pageTitle,footer:pageFooter}):[];if(lastSimulationResult){pages.push(reportSummaryPage(lastSimulationResult));")
    replace("pages.push(...reportLedgerPages());}if(!pages.length)", "pages.push(...reportLedgerPages());}}if(!pages.length)")
    replace("function exportFullReportPdf(){", """let fullReportDownloadUrl=null;
function clearFullReportDownload(){if(fullReportDownloadUrl){URL.revokeObjectURL(fullReportDownloadUrl);fullReportDownloadUrl=null;}$('fullReportDownload')?.remove();}
function prepareFullReportDownload(blob,filename){clearFullReportDownload();const a=document.createElement('a');fullReportDownloadUrl=URL.createObjectURL(blob);a.id='fullReportDownload';a.className='btn';a.href=fullReportDownloadUrl;a.download=filename;a.textContent='Save PDF';a.title='Save the completed full report PDF';$('exportReportBtn').insertAdjacentElement('afterend',a);}
function exportFullReportPdf(){""")
    replace("savePdfBlob(blob,`Retirement_Decision_Report_${date}.pdf`,preopened);", "prepareFullReportDownload(blob,`Retirement_Decision_Report_${date}.pdf`);savePdfBlob(blob,`Retirement_Decision_Report_${date}.pdf`,preopened);")
    replace("ios?'Report opened — use the PDF download/save control':'Report downloaded'", "ios?'Report ready — use Save PDF or the opened PDF tab':'Report ready — use Save PDF if needed'")
    replace("btn.disabled=!lastSimulationResult;updateReportExportState();", "updateReportExportState();")
    return source
