import type { Stack } from "./types";

const featureFullstack = {
  id: "feature",
  label: "Feature full-stack",
  summary:
    "La séquence du playbook, dans l'ordre : le contrat backend, la route, les types générés, le composant, le cache, les tests, la porte qualité.",
  screens: [
    {
      id: "contrat",
      rank: "1",
      title: "Modéliser le contrat backend",
      intent:
        "PHP est la source de vérité. Les types et la validation vivent sur l'entité, et tout le reste en découle.",
      file: "src/Entity/SearchAlert.php",
      language: "php",
      source: "symfony-guidelines.md, Playbook 1 · reactony.md §2",
      highlightedLines: [7, 8, 9],
      pitfall:
        "Charge utile 1:1 avec l'entité : l'entité directement. Sous-ensemble d'une grosse entité : un DTO allowlist plus ObjectMapper, pour la sécurité. Rien qui corresponde à une entité : un DTO simple.",
      code: `<?php

class SearchAlert
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\\Column]
    private ?int $id = null;  // privé et sans Groups : le Serializer l'ignore

    #[Assert\\NotBlank]
    #[Assert\\Count(min: 1)]
    #[Groups(['search_alert:read', 'search_alert:create'])]
    public array $channels = [];

    #[Assert\\Email]
    #[Groups(['search_alert:create'])]
    public ?string $email = null;
}`,
    },
    {
      id: "schema",
      rank: "1 bis",
      title: "Le schéma suit l'entité",
      intent:
        "Pas de migration écrite à la main : le hook de déploiement applique le schéma. On relit donc le SQL qu'il va jouer avant de commiter.",
      language: "bash",
      source: "symfony-guidelines.md, Playbook 1 · §19",
      highlightedLines: [2],
      pitfall:
        "Une colonne qui se durcit (non nullable, unique) sur des lignes existantes fait échouer la mise à jour, donc le déploiement. La commande de back-fill se branche dans le hook, au-dessus de la ligne du schéma.",
      code: `# Le SQL que le déploiement va jouer, à lire avant de commiter :
php bin/console doctrine:schema:update --dump-sql

# Et le mapping reste cohérent avec la base :
php bin/console doctrine:schema:validate --skip-sync`,
    },
    {
      id: "route",
      rank: "2",
      title: "La route du contrôleur",
      intent:
        "format: 'json' est obligatoire, #[IsGranted] aussi. Le contrôleur oriente : Domain décide, Service exécute.",
      file: "src/Controller/SearchAlertController.php",
      language: "php",
      source: "symfony-guidelines.md §3 · Playbook 2",
      highlightedLines: [3, 4, 5],
      pitfall:
        "Sans format: 'json', les erreurs 422 arrivent en HTML et le frontend ne sait plus les parser. Et un docblock en prose fuit dans le summary OpenAPI, donc dans le JSDoc du SDK : le garder en tags seulement.",
      code: `<?php

#[IsGranted('ROLE_USER')]
#[Route('/api/search-alerts', methods: ['POST'], format: 'json')]
#[Serialize(code: 201, context: ['groups' => ['search_alert:read']])]
public function create(
    #[MapRequestPayload] SearchAlert $searchAlert,
): SearchAlert {
    // CRUD simple : l'EntityManager directement dans le contrôleur.
    $this->entityManager->persist($searchAlert);
    $this->entityManager->flush();

    return $searchAlert;
}`,
    },
    {
      id: "regle",
      rank: "2 bis",
      title: "La règle métier vit dans Domain",
      intent:
        "Dès qu'il y a une décision (un seuil, une éligibilité, un calcul), elle sort du contrôleur. Domain décide sans rien connaître d'extérieur, Service exécute, le contrôleur relie les deux.",
      file: "src/Domain/SearchAlert/SearchAlertRules.php",
      language: "php",
      source: "symfony-guidelines.md, Principes · §2 · §15",
      highlightedLines: [7, 8, 16],
      pitfall:
        "Un Domain qui injecte l'EntityManager ou un client HTTP n'est plus un Domain : il ne se teste plus sans mocks. La règle reçoit des valeurs, elle rend une décision.",
      code: `<?php

final class SearchAlertRules
{
    private const MAX_ALERTS_PER_USER = 10;

    public function canCreate(int $existingAlerts): bool
    {
        return $existingAlerts < self::MAX_ALERTS_PER_USER;
    }
}

// Dans le contrôleur : le Domain décide, puis on exécute.
$count = $this->searchAlertRepository->countFor($this->getUser());

if (!$this->rules->canCreate($count)) {
    throw new UnprocessableEntityHttpException("Nombre maximal d'alertes atteint.");
}`,
    },
    {
      id: "types",
      rank: "3",
      title: "La génération de types",
      intent:
        "Une commande, et le contrat PHP devient des types TS, du Zod, un SDK et les queryOptions. Rien n'est écrit à la main de ce côté.",
      file: "Makefile",
      language: "makefile",
      source: "symfony-guidelines.md, Playbook 3 · reactony.md §5",
      highlightedLines: [5],
      pitfall:
        "openapi.yaml et assets/lib/api/ sont commités : la porte de dérive compare le généré au commité, et git diff --exit-code ne verrait rien s'ils étaient ignorés.",
      code: `types:
	php -d memory_limit=512M bin/console nelmio:apidoc:dump --format=yaml > openapi.yaml
	pnpm openapi-ts

# En CI, la porte de dérive :
#   make types && git diff --exit-code openapi.yaml assets/lib/api/`,
    },
    {
      id: "genere",
      rank: "3 bis",
      title: "Ce que la commande a écrit pour vous",
      intent:
        "Une commande, et tout le contrat backend existe en TypeScript : les types, les schémas Zod, une fonction par endpoint, les options TanStack Query. Ce dossier se consomme, il ne s'écrit pas.",
      file: "assets/lib/api/",
      language: "ts",
      source: "reactony.md §5",
      highlightedLines: [9, 10, 13, 16, 19],
      pitfall:
        "Le dossier est commité, comme openapi.yaml. La porte de dérive compare le généré au commité : git diff --exit-code ne verrait rien s'il était ignoré.",
      code: `// Écrit par \`make types\`, commité, jamais édité à la main :
//
//   assets/lib/api/
//     types.gen.ts   les types du contrat, un par schéma OpenAPI
//     zod.gen.ts     les schémas Zod, tirés des contraintes #[Assert] du PHP
//     sdk.gen.ts     une fonction typée par endpoint, multipart compris
//     ...            les queryOptions et mutationOptions du plugin TanStack Query

import { getSearchAlertListOptions, postSearchAlert } from "@/lib/api";
import { zSearchAlert } from "@/lib/api/zod.gen";

// Lire : les options générées portent déjà la queryKey et le queryFn.
const { data } = useQuery({ ...getSearchAlertListOptions({ query: filters }) });

// Valider : le schéma descend des contraintes PHP, il ne se réécrit pas ici.
const form = useForm({ resolver: zodResolver(zSearchAlert) });

// Écrire : une fonction par endpoint, typée sur le corps attendu.
await postSearchAlert({ body: values });`,
    },
    {
      id: "montage",
      rank: "4",
      title: "Le montage dans la page Twig",
      intent:
        "Twig rend la page, React ne prend que l'îlot interactif. Les données initiales descendent en props, sérialisées avec les mêmes groupes que l'API.",
      file: "templates/search_alert/index.html.twig",
      language: "twig",
      source: "symfony-guidelines.md, Playbook 4 · reactony.md §6",
      highlightedLines: [4, 5, 6],
      pitfall:
        "Chaque îlot est enveloppé une fois dans un AppProviders (QueryClientProvider et Toaster) : sans lui, le premier useMutation plante au rendu, et le toast ne s'affiche nulle part.",
      code: `{% extends 'base.html.twig' %}

{% block body %}
    <div {{ react_component('SearchAlertForm', {
        farm: farm|serialize('json', { groups: ['farm:read'] }),
    }) }}></div>
{% endblock %}

{# assets/react/controllers/SearchAlertForm.tsx :
   export default function (props) {
     return <AppProviders><SearchAlertForm {...props} /></AppProviders>;
   } #}`,
    },
    {
      id: "formulaire",
      rank: "5",
      title: "Le composant React",
      intent:
        "Un seul patron de formulaire : Controller de RHF, la famille Field de shadcn, le Zod généré, useMutation. Le 422 revient champ par champ.",
      file: "assets/components/search-alert-form.tsx",
      language: "tsx",
      source: "reactony.md §4 · §3",
      highlightedLines: [9, 15, 16, 17],
      pitfall:
        "Les deux clés : data-invalid sur <Field>, qui bascule le bloc entier en état d'erreur, et aria-invalid sur le contrôle. Le vieux <Form>/<FormField>/<FormMessage> est toléré dans l'existant, pas pour du neuf.",
      code: `import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import { postSearchAlert } from "@/lib/api";
import { zSearchAlert } from "@/lib/api/zod.gen"; // généré
import { handleSdkError } from "@/lib/parseViolations";

type FormValues = z.infer<typeof zSearchAlert>;

const form = useForm<FormValues>({
  resolver: zodResolver(zSearchAlert),
  defaultValues: { channels: [], email: "" },
});

const mutation = useMutation({
  mutationFn: async (values: FormValues) => {
    const result = await postSearchAlert({ body: values });
    const errors = handleSdkError(result);
    if (errors) {
      Object.entries(errors).forEach(([field, message]) =>
        form.setError(field as any, { message }),
      );
      throw new Error("Validation failed");
    }
  },
});

<Controller
  name="channels"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Canaux</FieldLabel>
      <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>;`,
    },
    {
      id: "action-simple",
      rank: "5 bis",
      title: "Action simple, édition en ligne",
      intent:
        "Un seul champ, un toggle, un date picker : RHF est de trop. useMutation, le SDK, handleSdkError, un toast.",
      language: "tsx",
      source: "reactony.md §4",
      highlightedLines: [5, 7, 8],
      code: `import { toast } from "sonner";

const mutation = useMutation({
  mutationFn: async (data: { id: string; value: string }) => {
    const result = await postFieldUpdate({ body: data });
    const errors = handleSdkError(result);
    if (errors) throw new Error(Object.values(errors)[0]);
  },
  onSuccess: () => toast.success("Enregistré"),
  onError: (error: Error) => toast.error(error.message),
});`,
    },
    {
      id: "cache",
      rank: "6",
      title: "Invalider le cache",
      intent:
        "Toute mutation qui change une donnée lue ailleurs invalide, dans son onSuccess, avec les mêmes queryOptions générées.",
      language: "tsx",
      source: "reactony.md §4 · Playbook 5",
      highlightedLines: [6, 7],
      code: `import { getSearchAlertListOptions } from "@/lib/api";

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: postSearchAlert,
  onSuccess: () =>
    queryClient.invalidateQueries({ ...getSearchAlertListOptions({ query: filters }) }),
});`,
    },
    {
      id: "tests",
      rank: "7",
      title: "Les tests dus",
      intent:
        "Ce qu'une nouvelle route et un nouveau parcours doivent, par rendement décroissant.",
      file: "tests/Functional/SearchAlertControllerTest.php",
      language: "php",
      source: "symfony-guidelines.md, Playbook 6 · §13",
      highlightedLines: [9, 14],
      pitfall:
        "Le calcul d'argent (frais, paliers, tranches) part avec un test basé sur les propriétés, via Eris : les cas limites d'arrondi ne se trouvent pas à la main.",
      code: `<?php

public function testCreateSearchAlert(): void
{
    $client = static::createClient();
    $client->loginUser(UserFactory::createOne()->_real());

    // Le contrat HTTP.
    $client->jsonRequest('POST', '/api/search-alerts', ['channels' => ['email']]);
    self::assertResponseStatusCodeSame(201);

    // Et l'état en base : les deux, pas l'un ou l'autre.
    SearchAlertFactory::assert()->count(1);
}

// Fonctionnel PHPUnit pour toute nouvelle route /api/ non triviale.
// Unitaire sans mocks pour le Domain pur, Foundry pour construire les entités.
// Vitest + RTL + MSW pour les 422 d'un formulaire React.
// Playwright pour chaque nouveau parcours utilisateur.`,
    },
    {
      id: "dod",
      rank: "8",
      title: "Definition of Done",
      intent: "La feature est finie quand toutes ces lignes sont vertes.",
      language: "md",
      source: "symfony-guidelines.md, Definition of Done",
      code: `- [ ] /quality passe : PHPStan niveau 9+, PHP-CS-Fixer, ESLint, Prettier, \`tsc --noEmit\`
- [ ] \`make types\` ne produit aucune dérive dans \`assets/lib/api/\`
- [ ] \`doctrine:schema:validate --skip-sync\` OK
- [ ] \`lint:container\` OK
- [ ] Un test fonctionnel par nouvelle route /api/ non triviale
- [ ] Un test basé sur les propriétés (Eris) sur tout nouveau calcul d'argent
- [ ] Un spec Playwright par nouveau parcours utilisateur
- [ ] /live-test joue : chemin nominal plus un cas limite, console et réseau propres
- [ ] \`#[IsGranted]\` et \`format: 'json'\` présents sur les nouvelles routes /api/
- [ ] Aucun anti-pattern de la liste : \`useEffect\` + fetch, \`$request->get()\`, \`new RetryableHttpClient\`, \`any\` hors du \`setError\` de RHF`,
    },
  ],
};

const patterns = {
  id: "patterns",
  label: "Patterns du moment",
  summary:
    "Ce que Symfony 8.1 et PHP 8.5 ont apporté, et les patrons qui ne dépendent pas d'une feature en cours.",
  screens: [
    {
      id: "serialize",
      rank: "SF 8.1",
      title: "#[Serialize], le miroir de MapRequestPayload",
      intent:
        "L'entrée avait son attribut, la sortie a le sien. Le contrôleur retourne le DTO, le tableau ou l'entité : plus de $this->json(...).",
      language: "php",
      source: "symfony-guidelines.md §3",
      highlightedLines: [4],
      pitfall:
        "Vérifié sur un cas réel : sortie identique à l'octet près, zéro dérive OpenAPI, SDK ou Zod. C'est le défaut pour les nouveaux endpoints /api/, l'existant migre à l'occasion.",
      code: `<?php

/** @return array<int, ModelSave> */
#[Route('/api/farm-model/saves', methods: ['GET'], format: 'json')]
#[Serialize(context: ['groups' => ['model_save:read']])]
public function getModelSaves(): array
{
    return $this->getUser()->getModelSaves()->toArray();
}`,
    },
    {
      id: "php85",
      rank: "PHP 8.5",
      title: "Le pipe et le clone avec modifications",
      intent:
        "Le runtime et le plancher composer.json sont en 8.5 : sa syntaxe est la norme, et PHP-CS-Fixer y réécrit le code avec @PHP85Migration.",
      language: "php",
      source: "symfony-guidelines.md, PHP 8.5",
      highlightedLines: [4, 7],
      pitfall:
        "Un projet dont le composer.json dit encore >= 8.4 ne tient pas sa promesse dès qu'une ligne utilise |> : c'est un écart pour /gap-code, pas une tolérance.",
      code: `<?php

// Le pipe : la valeur traverse les fonctions dans l'ordre de lecture.
$slug = $title |> trim(...) |> strtolower(...);

// Un wither sur un objet readonly, sans constructeur recopié à la main.
$published = clone($draft, ['status' => Status::Published]);

// Une méthode dont on ne doit pas ignorer le retour.
#[\\NoDiscard]
public function withPrice(Money $price): static { /* ... */ }`,
    },
    {
      id: "filtres",
      rank: "Lecture",
      title: "Les filtres GET passent par un DTO",
      intent:
        "Le seul cas où un DTO se justifie d'office : des filtres ne sont pas une entité.",
      language: "php",
      source: "reactony.md §1 · symfony-guidelines.md §4",
      highlightedLines: [5, 7],
      code: `<?php

/** @return array<int, Farm> */
#[Route('/api/farms', methods: ['GET'], format: 'json')]
#[Serialize(context: ['groups' => ['farm:read']])]
public function list(
    #[MapQueryString] FarmFilterDto $filters = new FarmFilterDto(),
): array {
    return $this->farmRepository->findByFilters($filters);
}`,
    },
    {
      id: "allowlist",
      rank: "Écriture",
      title: "Le DTO allowlist, pour un sous-ensemble",
      intent:
        "Quand le formulaire édite quelques champs d'une grosse entité, le DTO est la liste de ce qui a le droit de bouger, et ObjectMapper fait le report.",
      language: "php",
      source: "symfony-guidelines.md §4",
      highlightedLines: [3, 5],
      code: `<?php

#[Map(target: Profile::class)]
final class PartialProfileDto
{
    #[Assert\\Length(max: 120)]
    public ?string $bio = null;

    #[Assert\\NotBlank]
    public string $city = '';
}

// Dans le contrôleur : $this->objectMapper->map($dto, $profile);
// Ce qui n'est pas dans le DTO ne peut pas être écrit, même envoyé.`,
    },
    {
      id: "upload",
      rank: "SF 8.1",
      title: "L'upload de fichier",
      intent:
        "Un DTO plat avec un ?UploadedFile et son Assert\\File, par MapRequestPayload. L'identifiant vit dans la route.",
      language: "php",
      source: "symfony-guidelines.md §4 · reactony.md §2",
      highlightedLines: [6, 7],
      pitfall:
        "Côté frontend, garder file.size aligné sur maxSize : au-delà de upload_max_filesize, le SAPI PHP jette silencieusement, le résolveur rend un 422 vide et le toast reste muet.",
      code: `<?php

final class ProjectImageDto
{
    #[Assert\\NotNull]
    #[Assert\\File(maxSize: '8M', mimeTypes: ['image/jpeg', 'image/png'])]
    public ?UploadedFile $image = null;
}

#[IsGranted('ROLE_USER')]
#[Route('/api/projects/{id}/image', methods: ['POST'], format: 'json')]
public function upload(string $id, #[MapRequestPayload] ProjectImageDto $dto): Response
{
    // Le SDK généré gère le multipart via formDataBodySerializer : rien à assembler à la main.
}`,
    },
    {
      id: "voter",
      rank: "Sécurité",
      title: "Chaque affordance a le voter de son action",
      intent:
        "Une page ouverte à un rôle large n'autorise pas tous ses boutons. On garde chaque appel à l'action avec le voter de l'action visée, sur le sujet.",
      language: "twig",
      source: "symfony-guidelines.md §3",
      highlightedLines: [2, 3],
      pitfall:
        "Un is_granted('ROLE_X') brut sur un bouton est la fuite récurrente : le rôle voit la page, clique, et prend un 403 qui remonte dans Sentry comme un bug.",
      code: `{# la page est ouverte à plusieurs rôles, les boutons ne le sont pas #}
{% if is_granted('edit', structure) %}...{% endif %}
{% if is_granted('show_groups', structure) %}...{% endif %}`,
    },
    {
      id: "foundry",
      rank: "Tests",
      title: "Foundry et le rollback transactionnel",
      intent:
        "Les entités de test se construisent par factory, et DAMA rend chaque test indépendant sans truncate manuel.",
      language: "php",
      source: "symfony-guidelines.md §13",
      code: `<?php

// Une factory dit l'intention du test, pas la forme de la table.
$searchAlert = SearchAlertFactory::createOne(['channels' => ['email']]);

SearchAlertFactory::createMany(3, ['channels' => ['sms']]);

// DAMA Doctrine Test Bundle enveloppe chaque test dans une transaction
// et la rejette à la fin : pas de nettoyage à écrire, pas de fuite entre tests.`,
    },
  ],
};

const pieges = {
  id: "pieges",
  label: "Pièges",
  summary:
    "Les anti-patterns fermés. Trouvés dans l'existant, ils sont à refactorer, pas à recopier.",
  screens: [
    {
      id: "fetch",
      rank: "Données",
      title: "useEffect + fetch, et le fetch nu",
      intent:
        "Les queryOptions sont générées par hey-api : les écrire à la main, ou pire les contourner, c'est perdre le typage et le cache d'un coup.",
      language: "tsx",
      source: "reactony.md §10",
      highlightedLines: [2, 3, 4, 7],
      code: `// Non.
useEffect(() => {
  fetch("/api/search-alerts").then((r) => r.json()).then(setSearchAlerts);
}, []);

// Non plus : un fetch nu contourne le SDK généré.
const response = await fetch("/api/search-alerts", { method: "POST" });

// Oui.
const { data } = useQuery({ ...getSearchAlertListOptions({ query: filters }) });`,
    },
    {
      id: "422",
      rank: "Formulaire",
      title: "Une mutation sans handleSdkError",
      intent:
        "Les 422 sont silencieusement perdus pour l'utilisateur : le formulaire ne bouge pas, aucun champ ne rougit, rien n'explique.",
      language: "tsx",
      source: "reactony.md §10 · §3",
      highlightedLines: [2, 3],
      code: `// Non.
const mutation = useMutation({ mutationFn: postSearchAlert });

// Oui : les violations remontent champ par champ.
const errors = handleSdkError(result);
if (errors) {
  Object.entries(errors).forEach(([field, message]) =>
    form.setError(field as any, { message }),
  );
}

// form.setError(field as any, ...) est le seul any toléré du projet :
// c'est le contournement documenté du typage de Object.entries avec RHF.`,
    },
    {
      id: "stimulus",
      rank: "Twig",
      title: "Un nouveau contrôleur Stimulus",
      intent:
        "Stimulus n'est que le pont de montage. Un contrôleur avec du state, un fetch, de la logique : c'est un îlot React.",
      language: "twig",
      source: "reactony.md §6 · §10",
      highlightedLines: [1, 2, 3, 4],
      pitfall:
        'Une tolérance : un comportement DOM sans état, sous une trentaine de lignes, un copier-dans-le-presse-papier par exemple, où un îlot serait disproportionné. Et réactiver Turbo Drive sans décision explicite remonte les îlots React et leur fait perdre leur état. Le site est délibérément en data-turbo="false".',
      code: `{# Le montage, et rien d'autre. #}
<div {{ react_component('SearchAlertForm', {
    farm: farm|serialize('json', { groups: ['farm:read'] }),
}) }}></div>`,
    },
    {
      id: "query-order",
      rank: "Doctrine",
      title: "Une requête sans ORDER BY n'a pas d'ordre",
      intent:
        "Postgres rend les lignes dans l'ordre qui l'arrange, et il change avec le plan. Le tri stable se déclare.",
      language: "php",
      source: "symfony-guidelines.md §7",
      highlightedLines: [6],
      pitfall:
        "KnpPaginator place son propre tri devant le vôtre : le tri par défaut se passe en option du paginateur, pas seulement dans le QueryBuilder.",
      code: `<?php

return $this->createQueryBuilder('a')
    ->andWhere('a.active = true')
    // Sans cette ligne, l'ordre dépend du plan d'exécution.
    ->orderBy('a.createdAt', 'DESC')
    ->addOrderBy('a.id', 'DESC') // départage, pour rendre l'ordre total
    ->getQuery()
    ->getResult();`,
    },
    {
      id: "secret-log",
      rank: "Logs",
      title: "Un secret en query string finit dans les logs",
      intent:
        "HttpClient journalise chaque appel en INFO avec l'URL complète, query string comprise. Une API amont qui s'authentifie par un paramètre key ou token écrit donc son propre identifiant dans les logs, et dans les breadcrumbs Sentry.",
      file: "src/Logger/RedactQueryStringSecretsProcessor.php",
      language: "php",
      source: "symfony-guidelines.md, Logging & Sentry",
      highlightedLines: [5, 9, 10, 11],
      pitfall:
        "Le contrat appartient à l'amont, donc le paramètre ne peut en général pas passer en en-tête : on caviarde à la sortie. Et avec un handler fingers_crossed, ces lignes INFO remontent dès que quoi que ce soit d'autre échoue dans la même requête, c'est-à-dire précisément quand l'amont est instable.",
      code: `<?php

// Appliqué à tous les canaux : la requête part intacte, seule la ligne de log change.
#[AsMonologProcessor]
final class RedactQueryStringSecretsProcessor
{
    private const SENSITIVE = ['key', 'token', 'api_key', 'access_token', 'password'];

    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(message: preg_replace(
            '/\\b('.implode('|', self::SENSITIVE).')=[^&"\\s]+/i',
            '$1=[REDACTED]',
            $record->message,
        ));
    }
}

// Pour /gap-code : un client d'API qui passe un identifiant dans query est un
// constat Haute tant que rien ne caviarde à la sortie.`,
    },
  ],
};

export const SYMFONY_REACT: Stack = {
  id: "symfony-react",
  label: "Symfony, îlots React",
  shortLabel: "Symfony + React",
  thesis:
    "Twig rend les pages, React prend la main là où il faut de l'interaction. PHP est la source de vérité, les types TS en descendent.",
  guideline: "symfony-react/symfony-guidelines.md et reactony.md",
  tracks: [featureFullstack, patterns, pieges],
};
