( function( $ ) {
    function parse(spec, el) {
        vg.parse.spec(spec, function(chart) { chart({el:el}).update(); });
    }
    $('.mw-wiki-limn').each(function(){
        var definition = $(this).data('spec');
        parse(definition, this);
    });
} ( jQuery ) );
