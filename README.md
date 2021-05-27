Here the LRR file for Switzerland is in the works.

Structure:
* Primarily, courts are included in the (dominant) language of the respective canton.
* For these courts, translations in the other two official languages (de, fr or it) are offered as `variants`.
* `Variants` are available for both names and abbreviations (so far only `ABBREV`).

Notes:
* Authorities that may well have a decision-making function (e.g. government departments, bankruptcy offices, public prosecutors), but where this function is not the primary task of the authorities, have not been included so far.
* Only courts (as independent organisational units and thus decision-making bodies) are included, but not individual divisions or chambers of these courts. This can be added at a later stage, but prima facie seems largely unnecessary, as normally only the court as a whole is cited.
* The Fribourg "Cellule judiciaire itinérante" is apparently also referred to as such in German. It is assumed that this would also be the case in Italian practice. A translation has been refrained from so far.
* The commissions and the arbitral tribunal of the Cantonal Court of Appenzell-Innerrhoden could possibly also be understood as separate courts, but have not yet been included, as it is unclear whether this is also the case in practice, or whether they also act under the "mantle" of the Cantonal Court.
* Neuchâtel uses unique abbreviations for its courts. As it is unclear whether these have wider use; they have not been implemented, as then separate courts would probably have to be created for Neuchâtel only because of the abbreviations. However, it is assumed that these abbreviations are not used much outside of their own judicial administration.
* In general, Neuchâtel has a very unique way of classifying the decisions of its courts, which is very difficult to track in JSON. This might need to be adjusted with local experts at a later stage.
* The various arbitration boards in public law employment cases of the Canton of St. Gallen have been omitted for the time being, as they are presumably fairly unimportant for legal writing.
* In the case of Ticino, it is not entirely clear to me what is a court of its own and what is only a division/chamber of a court.

Todo:
* At the moment, it is unclear to me to what extent jurisdictions are appended to the courts. Would the court "Ordre des Avocats Jurassiens" of the jurisdiction "Jura" be rendered as "Ordre des Avocats Jurassiens Jura"? Or would a "%s" also need to be added to "name" for this to happen?
