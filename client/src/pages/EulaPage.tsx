import { useNavigate } from 'react-router-dom'
import { getLang } from '../lib/i18n'

const content = {
  en: {
    title: 'End User License Agreement',
    updated: 'Last updated: February 14, 2026',
    sections: [
      { h: '1. Agreement', p: 'This End User License Agreement ("EULA") is a legal agreement between you and ShaPop Ltd. ("ShaPop") for the use of the ShaPop mobile application ("App"). By installing or using the App, you agree to be bound by this EULA.' },
      { h: '2. License Grant', p: 'ShaPop grants you a limited, non-exclusive, non-transferable, revocable license to use the App on any Apple-branded device that you own or control, subject to the Usage Rules set forth in the Apple Media Services Terms and Conditions.' },
      { h: '3. License Restrictions', p: 'You may not: (a) copy, modify, or distribute the App; (b) reverse-engineer, decompile, or disassemble the App; (c) rent, lease, lend, sell, or sublicense the App; (d) use the App for any illegal purpose; (e) remove any proprietary notices from the App.' },
      { h: '4. Intellectual Property', p: 'The App and all content, features, and functionality are owned by ShaPop and are protected by international copyright, trademark, and other intellectual property laws. This EULA does not grant you any ownership rights.' },
      { h: '5. In-App Purchases', p: 'The App may offer products and services for purchase ("In-App Purchases"). These are marketplace transactions between buyers and sellers facilitated by ShaPop. All purchases are final once shipped, except as provided in the Return Policy or as required by applicable law.' },
      { h: '6. Third-Party Services', p: 'The App may integrate with third-party services (payment processors, streaming infrastructure, etc.). Your use of such services is subject to their respective terms and privacy policies. ShaPop is not responsible for third-party services.' },
      { h: '7. Updates', p: 'ShaPop may release updates to the App from time to time. Updates may be required for continued use. You agree that the App may automatically download and install updates.' },
      { h: '8. Termination', p: 'This EULA is effective until terminated. ShaPop may terminate this EULA if you fail to comply with its terms. Upon termination, you must cease all use of the App and delete all copies.' },
      { h: '9. Disclaimer of Warranties', p: 'THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. SHAPOP DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.' },
      { h: '10. Limitation of Liability', p: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, SHAPOP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP.' },
      { h: '11. Apple-Specific Terms', p: 'This EULA is between you and ShaPop only, not Apple Inc. Apple has no obligation to furnish any maintenance or support services. In the event of any failure of the App to conform to applicable warranties, you may notify Apple for a refund of the purchase price (if any). Apple is not responsible for addressing any claims relating to the App. Apple and its subsidiaries are third-party beneficiaries of this EULA.' },
      { h: '12. Governing Law', p: 'This EULA is governed by the laws of the State of Israel. Disputes shall be resolved in the courts of Tel Aviv-Yafo.' },
      { h: '13. Contact', p: 'For questions about this EULA: shapopcontact@gmail.com' },
    ],
  },
  he: {
    title: '\u05D4\u05E1\u05DB\u05DD \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9 \u05E7\u05E6\u05D4',
    updated: '\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05D7\u05E8\u05D5\u05DF: 14 \u05D1\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8 2026',
    sections: [
      { h: '1. \u05D4\u05E1\u05DB\u05DD', p: '\u05D4\u05E1\u05DB\u05DD \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05DC\u05DE\u05E9\u05EA\u05DE\u05E9 \u05E7\u05E6\u05D4 \u05D6\u05D4 ("\u05D4\u05E1\u05DB\u05DD") \u05D4\u05D5\u05D0 \u05D4\u05E1\u05DB\u05DD \u05DE\u05E9\u05E4\u05D8\u05D9 \u05D1\u05D9\u05E0\u05DA \u05DC\u05D1\u05D9\u05DF ShaPop \u05D1\u05E2"\u05DE \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4. \u05D1\u05D4\u05EA\u05E7\u05E0\u05D4 \u05D0\u05D5 \u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4, \u05D0\u05EA\u05D4 \u05DE\u05E1\u05DB\u05D9\u05DD \u05DC\u05D4\u05E1\u05DB\u05DD \u05D6\u05D4.' },
      { h: '2. \u05DE\u05EA\u05DF \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF', p: 'ShaPop \u05DE\u05E2\u05E0\u05D9\u05E7\u05D4 \u05DC\u05DA \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05DE\u05D5\u05D2\u05D1\u05DC, \u05DC\u05D0 \u05D1\u05DC\u05E2\u05D3\u05D9, \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E2\u05D1\u05E8\u05D4, \u05D5\u05E0\u05D9\u05EA\u05DF \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC, \u05DC\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05E2\u05DC \u05DE\u05DB\u05E9\u05D9\u05E8\u05D9 Apple \u05E9\u05D1\u05D1\u05E2\u05DC\u05D5\u05EA\u05DA.' },
      { h: '3. \u05D4\u05D2\u05D1\u05DC\u05D5\u05EA \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF', p: '\u05D0\u05E1\u05D5\u05E8: (\u05D0) \u05DC\u05D4\u05E2\u05EA\u05D9\u05E7, \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05D5 \u05DC\u05D4\u05E4\u05D9\u05E5; (\u05D1) \u05DC\u05E2\u05E9\u05D5\u05EA \u05D4\u05E0\u05D3\u05E1\u05D4 \u05DC\u05D0\u05D7\u05D5\u05E8; (\u05D2) \u05DC\u05D4\u05E9\u05DB\u05D9\u05E8 \u05D0\u05D5 \u05DC\u05DE\u05DB\u05D5\u05E8; (\u05D3) \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05DC\u05DE\u05D8\u05E8\u05D5\u05EA \u05D1\u05DC\u05EA\u05D9 \u05D7\u05D5\u05E7\u05D9\u05D5\u05EA; (\u05D4) \u05DC\u05D4\u05E1\u05D9\u05E8 \u05D4\u05D5\u05D3\u05E2\u05D5\u05EA \u05E7\u05E0\u05D9\u05D9\u05E0\u05D9\u05D5\u05EA.' },
      { h: '4. \u05E7\u05E0\u05D9\u05D9\u05DF \u05E8\u05D5\u05D7\u05E0\u05D9', p: '\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05D5\u05DB\u05DC \u05D4\u05EA\u05D5\u05DB\u05DF \u05E9\u05D9\u05D9\u05DB\u05D9\u05DD \u05DC-ShaPop \u05D5\u05DE\u05D5\u05D2\u05E0\u05D9\u05DD \u05E2"\u05D9 \u05D7\u05D5\u05E7\u05D9 \u05E7\u05E0\u05D9\u05D9\u05DF \u05E8\u05D5\u05D7\u05E0\u05D9 \u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9\u05D9\u05DD. \u05D4\u05E1\u05DB\u05DD \u05D6\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05DE\u05E2\u05E0\u05D9\u05E7 \u05D1\u05E2\u05DC\u05D5\u05EA.' },
      { h: '5. \u05E8\u05DB\u05D9\u05E9\u05D5\u05EA \u05D1\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4', p: '\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DE\u05D0\u05E4\u05E9\u05E8\u05EA \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D1\u05D9\u05DF \u05E7\u05D5\u05E0\u05D9\u05DD \u05DC\u05DE\u05D5\u05DB\u05E8\u05D9\u05DD. \u05DB\u05DC \u05D4\u05E8\u05DB\u05D9\u05E9\u05D5\u05EA \u05E1\u05D5\u05E4\u05D9\u05D5\u05EA \u05DC\u05D0\u05D7\u05E8 \u05DE\u05E9\u05DC\u05D5\u05D7, \u05DC\u05DE\u05E2\u05D8 \u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05D4\u05D7\u05D6\u05E8\u05D5\u05EA.' },
      { h: '6. \u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05E6\u05D3 \u05E9\u05DC\u05D9\u05E9\u05D9', p: '\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05E2\u05E9\u05D5\u05D9\u05D4 \u05DC\u05D4\u05E9\u05EA\u05DC\u05D1 \u05E2\u05DD \u05E9\u05D9\u05E8\u05D5\u05EA\u05D9 \u05E6\u05D3 \u05E9\u05DC\u05D9\u05E9\u05D9. \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05D4\u05DD \u05DB\u05E4\u05D5\u05E3 \u05DC\u05EA\u05E0\u05D0\u05D9\u05D4\u05DD. ShaPop \u05D0\u05D9\u05E0\u05D4 \u05D0\u05D7\u05E8\u05D0\u05D9\u05EA \u05DC\u05E9\u05D9\u05E8\u05D5\u05EA\u05D9\u05DD \u05E9\u05DC \u05E6\u05D3\u05D3\u05D9\u05DD \u05E9\u05DC\u05D9\u05E9\u05D9\u05D9\u05DD.' },
      { h: '7. \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD', p: 'ShaPop \u05E2\u05E9\u05D5\u05D9\u05D4 \u05DC\u05E4\u05E8\u05E1\u05DD \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD. \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05E2\u05E9\u05D5\u05D9\u05D9\u05DD \u05DC\u05D4\u05D9\u05D5\u05EA \u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05DC\u05D4\u05DE\u05E9\u05DA \u05E9\u05D9\u05DE\u05D5\u05E9.' },
      { h: '8. \u05E1\u05D9\u05D5\u05DD', p: '\u05D4\u05E1\u05DB\u05DD \u05D6\u05D4 \u05D1\u05EA\u05D5\u05E7\u05E3 \u05E2\u05D3 \u05DC\u05E1\u05D9\u05D5\u05DE\u05D5. ShaPop \u05E8\u05E9\u05D0\u05D9\u05EA \u05DC\u05E1\u05D9\u05D9\u05DD \u05D0\u05DD \u05DC\u05D0 \u05EA\u05E6\u05D9\u05D9\u05EA \u05D4\u05EA\u05E0\u05D0\u05D9\u05DD.' },
      { h: '9. \u05D5\u05D9\u05EA\u05D5\u05E8 \u05E2\u05DC \u05D0\u05D7\u05E8\u05D9\u05D5\u05EA', p: '\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DE\u05E1\u05D5\u05E4\u05E7\u05EA "\u05DB\u05DE\u05D5\u05EA \u05E9\u05D4\u05D9\u05D0" \u05DC\u05DC\u05D0 \u05D0\u05D7\u05E8\u05D9\u05D5\u05EA \u05DE\u05DB\u05DC \u05E1\u05D5\u05D2.' },
      { h: '10. \u05D4\u05D2\u05D1\u05DC\u05EA \u05D0\u05D7\u05E8\u05D9\u05D5\u05EA', p: '\u05D1\u05DE\u05D9\u05D3\u05D4 \u05D4\u05DE\u05E8\u05D1\u05D9\u05EA \u05D4\u05DE\u05D5\u05EA\u05E8\u05EA \u05D1\u05D7\u05D5\u05E7, ShaPop \u05DC\u05D0 \u05EA\u05D9\u05E9\u05D0 \u05D1\u05D0\u05D7\u05E8\u05D9\u05D5\u05EA \u05DC\u05E0\u05D6\u05E7\u05D9\u05DD \u05E2\u05E7\u05D9\u05E4\u05D9\u05DD.' },
      { h: '11. \u05EA\u05E0\u05D0\u05D9 Apple', p: '\u05D4\u05E1\u05DB\u05DD \u05D6\u05D4 \u05D1\u05D9\u05E0\u05DA \u05DC\u05D1\u05D9\u05DF ShaPop \u05D1\u05DC\u05D1\u05D3, \u05DC\u05D0 Apple. \u05DC-Apple \u05D0\u05D9\u05DF \u05D7\u05D5\u05D1\u05EA \u05EA\u05D7\u05D6\u05D5\u05E7\u05D4 \u05D0\u05D5 \u05EA\u05DE\u05D9\u05DB\u05D4. Apple \u05D5\u05D7\u05D1\u05E8\u05D5\u05EA \u05D4\u05D1\u05EA \u05E9\u05DC\u05D4 \u05D4\u05DD \u05DE\u05D5\u05D8\u05D1\u05D9\u05DD \u05E9\u05DC \u05D4\u05E1\u05DB\u05DD \u05D6\u05D4.' },
      { h: '12. \u05D3\u05D9\u05DF \u05D7\u05DC', p: '\u05D4\u05E1\u05DB\u05DD \u05DB\u05E4\u05D5\u05E3 \u05DC\u05D3\u05D9\u05E0\u05D9 \u05DE\u05D3\u05D9\u05E0\u05EA \u05D9\u05E9\u05E8\u05D0\u05DC. \u05E1\u05DB\u05E1\u05D5\u05DB\u05D9\u05DD \u05D9\u05D5\u05DB\u05E8\u05E2\u05D5 \u05D1\u05D1\u05EA\u05D9 \u05D4\u05DE\u05E9\u05E4\u05D8 \u05D1\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1-\u05D9\u05E4\u05D5.' },
      { h: '13. \u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8', p: '\u05DC\u05E9\u05D0\u05DC\u05D5\u05EA: shapopcontact@gmail.com' },
    ],
  },
  fr: {
    title: 'Contrat de licence utilisateur final',
    updated: 'Dernière mise à jour : 14 février 2026',
    sections: [
      { h: '1. Accord', p: 'Le présent Contrat de licence utilisateur final (« CLUF ») est un accord juridique entre vous et ShaPop Ltd. (« ShaPop ») régissant l\'utilisation de l\'application mobile ShaPop (« l\'Application »). En installant ou en utilisant l\'Application, vous acceptez d\'être lié par le présent CLUF.' },
      { h: '2. Concession de licence', p: 'ShaPop vous accorde une licence limitée, non exclusive, non transférable et révocable pour utiliser l\'Application sur tout appareil de marque Apple que vous possédez ou contrôlez, sous réserve des règles d\'utilisation définies dans les Conditions générales des services multimédia Apple.' },
      { h: '3. Restrictions de la licence', p: 'Vous ne pouvez pas : (a) copier, modifier ou distribuer l\'Application ; (b) procéder à la rétro-ingénierie, décompiler ou désassembler l\'Application ; (c) louer, prêter, vendre ou sous-licencier l\'Application ; (d) utiliser l\'Application à des fins illégales ; (e) supprimer les mentions de propriété de l\'Application.' },
      { h: '4. Propriété intellectuelle', p: 'L\'Application ainsi que l\'ensemble de son contenu, de ses fonctionnalités et de ses caractéristiques sont la propriété de ShaPop et sont protégés par les lois internationales sur le droit d\'auteur, les marques et la propriété intellectuelle. Le présent CLUF ne vous confère aucun droit de propriété.' },
      { h: '5. Achats intégrés', p: 'L\'Application peut proposer des produits et services à l\'achat (« Achats intégrés »). Il s\'agit de transactions de marketplace entre acheteurs et vendeurs facilitées par ShaPop. Tous les achats sont définitifs une fois expédiés, sauf disposition contraire de la Politique de retour ou de la loi applicable.' },
      { h: '6. Services tiers', p: 'L\'Application peut s\'intégrer à des services tiers (prestataires de paiement, infrastructure de streaming, etc.). Votre utilisation de ces services est soumise à leurs conditions et politiques de confidentialité respectives. ShaPop n\'est pas responsable des services tiers.' },
      { h: '7. Mises à jour', p: 'ShaPop peut publier des mises à jour de l\'Application de temps à autre. Les mises à jour peuvent être nécessaires pour continuer à utiliser l\'Application. Vous acceptez que l\'Application puisse télécharger et installer automatiquement les mises à jour.' },
      { h: '8. Résiliation', p: 'Le présent CLUF est en vigueur jusqu\'à sa résiliation. ShaPop peut résilier le présent CLUF si vous ne respectez pas ses conditions. En cas de résiliation, vous devez cesser toute utilisation de l\'Application et supprimer toutes les copies.' },
      { h: '9. Exclusion de garanties', p: 'L\'APPLICATION EST FOURNIE « EN L\'ÉTAT » SANS GARANTIE D\'AUCUNE SORTE. SHAPOP DÉCLINE TOUTE GARANTIE, EXPRESSE OU IMPLICITE, Y COMPRIS LES GARANTIES DE QUALITÉ MARCHANDE, D\'ADÉQUATION À UN USAGE PARTICULIER ET D\'ABSENCE DE CONTREFAÇON.' },
      { h: '10. Limitation de responsabilité', p: 'DANS TOUTE LA MESURE PERMISE PAR LA LOI, SHAPOP NE POURRA ÊTRE TENUE RESPONSABLE DES DOMMAGES INDIRECTS, ACCESSOIRES, SPÉCIAUX OU CONSÉCUTIFS RÉSULTANT DE VOTRE UTILISATION DE L\'APPLICATION.' },
      { h: '11. Conditions spécifiques à Apple', p: 'Le présent CLUF est conclu entre vous et ShaPop uniquement, et non avec Apple Inc. Apple n\'a aucune obligation de fournir des services de maintenance ou d\'assistance. En cas de non-conformité de l\'Application aux garanties applicables, vous pouvez en informer Apple pour obtenir un remboursement du prix d\'achat (le cas échéant). Apple n\'est pas responsable du traitement des réclamations relatives à l\'Application. Apple et ses filiales sont des tiers bénéficiaires du présent CLUF.' },
      { h: '12. Droit applicable', p: 'Le présent CLUF est régi par les lois de l\'État d\'Israël. Les litiges seront tranchés par les tribunaux de Tel-Aviv-Jaffa.' },
      { h: '13. Contact', p: 'Pour toute question relative au présent CLUF : shapopcontact@gmail.com' },
    ],
  },
  es: {
    title: 'Acuerdo de Licencia de Usuario Final',
    updated: 'Ultima actualizacion: 14 de febrero de 2026',
    sections: [
      { h: '1. Acuerdo', p: 'Este Acuerdo de Licencia de Usuario Final ("EULA") es un acuerdo legal entre usted y ShaPop Ltd. para el uso de la aplicacion ShaPop. Al instalar o usar la App, acepta este EULA.' },
      { h: '2. Concesion de Licencia', p: 'ShaPop le otorga una licencia limitada, no exclusiva, intransferible y revocable para usar la App en dispositivos Apple de su propiedad.' },
      { h: '3. Restricciones', p: 'No puede: (a) copiar, modificar o distribuir la App; (b) realizar ingenieria inversa; (c) alquilar o sublicenciar; (d) usar para fines ilegales; (e) eliminar avisos de propiedad.' },
      { h: '4. Propiedad Intelectual', p: 'La App y todo su contenido pertenecen a ShaPop y estan protegidos por leyes internacionales de propiedad intelectual.' },
      { h: '5. Compras en la App', p: 'La App facilita transacciones entre compradores y vendedores. Las compras son finales una vez enviadas, excepto segun la Politica de Devoluciones.' },
      { h: '6. Servicios de Terceros', p: 'La App puede integrarse con servicios de terceros. Su uso esta sujeto a sus respectivos terminos. ShaPop no es responsable de servicios de terceros.' },
      { h: '7. Actualizaciones', p: 'ShaPop puede publicar actualizaciones. Las actualizaciones pueden ser necesarias para continuar usando la App.' },
      { h: '8. Terminacion', p: 'Este EULA es efectivo hasta su terminacion. ShaPop puede terminarlo por incumplimiento.' },
      { h: '9. Exclusion de Garantias', p: 'LA APP SE PROPORCIONA "TAL CUAL" SIN GARANTIAS DE NINGUN TIPO.' },
      { h: '10. Limitacion de Responsabilidad', p: 'SHAPOP NO SERA RESPONSABLE POR DANOS INDIRECTOS, INCIDENTALES O CONSECUENTES.' },
      { h: '11. Terminos de Apple', p: 'Este EULA es entre usted y ShaPop, no Apple. Apple no tiene obligacion de mantenimiento. Apple y sus subsidiarias son terceros beneficiarios de este EULA.' },
      { h: '12. Ley Aplicable', p: 'Este EULA se rige por las leyes de Israel. Disputas en tribunales de Tel Aviv-Yafo.' },
      { h: '13. Contacto', p: 'Preguntas: shapopcontact@gmail.com' },
    ],
  },
}

export default function EulaPage() {
  const navigate = useNavigate()
  const lang = getLang()
  const c = content[lang] || content.fr

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', paddingBottom: '80px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#000', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{c.title}</h1>
      </div>
      <div style={{ padding: '20px 20px' }}>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '24px' }}>{c.updated}</p>
        {c.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{s.h}</h2>
            <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
